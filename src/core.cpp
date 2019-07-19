/*
* The main loop driving the emulation.
* 
* This updated version uses a cycle-by-cycle emulation of the different
* C64 components (VIC, SID, CIA, CPU). 
*
* Most of this file is dedidated to dealing with the inconsistencies of
* garbage PSID files. (By comparison the loop used for RSID is rather
* simple.)
*
* Note: It is still a somewhat high level emulation, i.e. unlike very precise 
* emulators it does NOT emulate different phases of a system clock cycle, nor respective 
* detailed internal workings of all the various components (e.g. CPU). 
* 
* WebSid (c) 2019 Jürgen Wothke
* version 0.93
*
* Terms of Use: This software is licensed under a CC BY-NC-SA 
* (http://creativecommons.org/licenses/by-nc-sa/4.0/).
*/

#include <string.h>
#include <stdio.h>
#include <math.h>

#include "core.h"

extern "C" {
#include "env.h"
#include "memory.h"
#include "cpu.h"
#include "vic.h"
#include "cia.h"
#include "hacks.h"
}
#include "sid.h"

#include <emscripten.h>

// if 'init' takes longer than 2 secs then something is wrong (mb in endless loop)
#define CYCLELIMIT 2000000


/*
* snapshot of c64 memory right after loading.. 
* it is restored before playing a new track..
*/
static uint8_t _memory_snapshot[MEMORY_SIZE];

static double _cycles;	// to handle cross frame overflow


static void reset(uint32_t sample_rate, uint8_t ntsc_mode, uint8_t compatibility) {		
	cpuInit();	
	
    memResetIO();

	ciaReset(vicCyclesPerScreen(), envIsRSID());
		
	vicReset(envIsRSID(), ntsc_mode);
	
	SID::resetAll(sample_rate, envSIDAddresses(), envSID6581s(), compatibility, 1);
	
	_cycles= 0;
}



// ------------------ to run Wolfgang Lorenz's test-suite ---------------------

#ifdef TEST
extern uint8_t test_running;

void testInit(void)
{
	memCopyToRAM(_memory_snapshot, 0, MEMORY_SIZE);
	reset(44100, 0, 1);		
}

void Core::rsidRunTest() {
	testInit();
	
	// use same sequence as in runEmulation (just without generating sample output)
	while(test_running) {
		// VIC always uses the 1st phase of each ϕ2 clock cycle (for bus access) so it should be clocked first
		// (after all it is where the system clock comes from..)
		vicClock();		
		ciaClock();
		SID::clockAll();
		
		uint8_t valid_pc= cpuClock();	// invalid "main" should just keep burning cycles one-by-one
		
		if (!valid_pc ) { 
			test_running= 0;
		}	
		cpuClockSystem();
	}
}
#endif


// -------------------- regular (RSID) C64 emulation ------------------------------


void runEmulation(int16_t *synth_buffer, int16_t **synth_trace_bufs, uint16_t samples_per_call) {
	double n= SID::getCyclesPerSample();

	// trivia: The system clock rate (and others) is generated by the VIC and feed to the CPU's
	// ϕ1 pin. The CPU pin that then outputs the system clock rate for use by other components is 
	// called Phase 2 or Phi2 (ϕ2).

	for (int i = 0; i<samples_per_call; i++) {
		while(_cycles < n) {

			// VIC always uses the 1st phase of each ϕ2 clock cycle (for bus access) so it should be clocked first
			vicClock();
			ciaClock();	
			SID::clockAll();
			
			cpuClock();	// invalid "main" should just keep burning cycles one-by-one
			
			cpuClockSystem();
			_cycles++;
		}
		_cycles-= n;	// keep overflow
		
		SID::synthSample(synth_buffer, synth_trace_bufs, i);
	}
}


// -------------------- handling for dumbshit PSID crap ------------------------------

static int32_t	_timer_psid_slot_overflow= 0;	// to keep equally spaced intervals across frame boundaries
static uint16_t	_timer_psid_pc= 0;				// in case the previous call did not yet complete
static uint8_t	_psid_bank_setting;

uint16_t getTimerForPSID() {
	uint16_t t= ciaGetTimerPSID();	// may not be configured by for PSID (see Alien.sid, Magicians_Ball.sid)	
	return (t == 0) ? vicCyclesPerScreen() : t;
}

static uint8_t isDummyIrqVectorPSID() {
	// PSID use of 0314/0315 vector which is technically not setup correctly (e.g. Ode_to_Galway_Remix.sid):
	// PSIDs may actually set the 0314/15 vector via INIT, turn off the kernal ROM and 
	// not provide a useful fffe/f vector.. and we need to handle that crap..
	
	if ((envSidPlayAddr() != 0) || (((memGet(0xfffe)|(memGet(0xffff)<<8)) == 0) && envIsPSID() &&
			((memGet(0x0314)|(memGet(0x0315)<<8)) != 0))) {
		
		return 1;
	}
	return 0;
}

static uint16_t getIrqVectorPSID() {
	if (envSidPlayAddr() != 0) {
		// no point going through the standard interrupt routines with this PSID crap.. we
		// cannot tell if it behaves like a 0314/15 or like a fffe/f routine anyway... (and the stack will likely be messed up)
		return envSidPlayAddr();	
	} 

	uint16_t irq_addr= (memGet(0xfffe)|(memGet(0xffff)<<8));	

	if ((irq_addr == 0) && envIsPSID()) {	// see isDummyIrqVectorPSID()
		irq_addr= (memGet(0x0314)|(memGet(0x0315)<<8));		
	}
	return irq_addr;
}

void preparePlayPSID() {
	// PSID garbage requires the bank setting to be restored to what is was after INIT before each PLAY

	memWriteRAM(0x0001, _psid_bank_setting);	// test-cases: Madonna_Mix.sid, 8-Bit_Keys_Theme.sid

	// restore environment to something useful since dumbshit PSID probably corrupted it..
	if (isDummyIrqVectorPSID()) {
		// no point in trying to keep the stack consistent for a PSID
		cpuRegReset();
	}
	
	cpuResetToIrqPSID(getIrqVectorPSID());	
}

static void runEmuTimerPSID(int16_t *synth_buffer, int16_t **synth_trace_bufs, uint16_t samples_per_call) {
	// NOTE: There are crappy PSID songs that use timing that will shift PLAY call positions over time (e.g.
	// Sacred_Armour_of_Antiriad.sid which uses a 1250 cycles timer and an IRQ handler that takes longer
	// than that interval). Other songs use timer intervals longer than one frame, e.g. Transformers.sid
	// which makes a PLAY call every 1.5 screens. I.e. the "play" calls may eventually cross frame boundaries and 
	// may need to be resumed in the next frame
	
	double n= SID::getCyclesPerSample();

	// cycles available in the "current" interval
	uint16_t slot_cycles= _timer_psid_slot_overflow ? _timer_psid_slot_overflow : getTimerForPSID();
	
	uint8_t valid_pc = 0;
	if (_timer_psid_pc) {
		// remaining "PLAY" from previous frame.. continue where previous frame stopped
		valid_pc= 1;
	}
	
	uint16_t irq_cycles=0;	// cycles used by the IRQ handler in this frame's call
	int16_t fill_cycles= _timer_psid_slot_overflow;	// filler cycles needed after the current IRQ handler (will be adjusted if there is a _timer_psid_pc as well )
	
	for (int i = 0; i<samples_per_call; i++) {	
		while(_cycles < n) {
			vicClock();
			ciaClock();
			SID::clockAll();
		
			if (valid_pc) {
				irq_cycles++;
				valid_pc= cpuClock();	// just run until it returns
								
				if (!valid_pc) {	
					// the IRQ completed and it may have used less OR MORE cycles than what was available for its "slot"					
					
					if (_timer_psid_pc) {
						// just completed the overflowed IRQ from previous frame
						if (_timer_psid_slot_overflow) {		// overflowed slot-part from the previous page 
							
							if (irq_cycles > _timer_psid_slot_overflow) {
								// IRQ overflowed into the next "slot"			
								// correctly the next IRQ should immediately start after this one is done, but the future "timer"
								// events still should use the original schedule (which is NOT handled here)
								fill_cycles= 0;
							} else {
								// well behaved use of previous slot
								fill_cycles= _timer_psid_slot_overflow - irq_cycles;
							}							
							_timer_psid_slot_overflow= 0;
						} else {
							// incorrect PSID shit
							slot_cycles= getTimerForPSID();	// from one IRQ to the next					
							fill_cycles= 0;
						}
						_timer_psid_pc= 0;
												
					} else {	
						// regular in-frame IRQ completed 
						slot_cycles= getTimerForPSID();	// from one IRQ to the next					
						
						if (irq_cycles>slot_cycles) {
							// no filler needed since the next IRQ would already have been triggered						
							fill_cycles= 0;	// persume the next IRQ is already waiting..
							
							// try to keep timer equally spaced by removing the overflow from the 
							// available slot size
							slot_cycles-= (irq_cycles-slot_cycles) % slot_cycles;	// slow handler might even use multiple slots!						
						} else {
							// "fill" the remainder of the current slot
							fill_cycles= slot_cycles - irq_cycles;					// PS: this may reach into the next frame!																				
						}					
					}
				}
			} else {
				if (fill_cycles > 0) {
					fill_cycles--;	// fill the time between IRQ handler execution
				} else {
					// start next IRQ
					preparePlayPSID();
					ciaFakeIrqPSID();
					irq_cycles= 0;
					valid_pc = 1;
					fill_cycles= 0;					
//					slot_cycles= getTimerForPSID();	// handled above to allow for shorting after overflows..						
				}
			}
			
			cpuClockSystem();
			_cycles++;
		}
		_cycles-= n;	// keep overflow
		
		SID::synthSample(synth_buffer, synth_trace_bufs, i);
	}
		
	// handle overflow into the next frame
	_timer_psid_slot_overflow= fill_cycles;			// known wait-cycles that did not fit into the current frame 
	_timer_psid_pc= valid_pc ? cpuGetPC() : 0;
	
	if (_timer_psid_pc) {
		// current IRQ had to be paused and what remains of the "slot" must be resumed in the next frame
		if (irq_cycles>slot_cycles) {
			// IRQ already overflowed into the next "slot", and it is bloody pointless trying to 
			// handle this case in a fucking PSID environment... whatever is done here is bound to be wrong			
			_timer_psid_slot_overflow= 0;
		} else {
			_timer_psid_slot_overflow= slot_cycles - irq_cycles;
		}					
	}
}
	
static void runEmuRasterPSID(int16_t *synth_buffer, int16_t **synth_trace_bufs, uint16_t samples_per_call) {
	// in PSID context "raster IRQ" means 1x per frame

	// note: a PSID may actually setup CIA 1 timers but without wanting to use them - e.g. ZigZag.sid track2
	
	preparePlayPSID();
	vicFakeIrqPSID();	// just in case the garbabe PSIDs actually care
	
	double n= SID::getCyclesPerSample();
	uint8_t valid_pc = 1;
	
	for (int i = 0; i<samples_per_call; i++) {
		while(_cycles < n) {
		
			vicClock();
			ciaClock();
			SID::clockAll();

			if (valid_pc) {
				valid_pc= cpuClock();	// just run until it returns
			}
			
			cpuClockSystem();
			_cycles++;
		}
		_cycles-= n;	// keep overflow
		
		SID::synthSample(synth_buffer, synth_trace_bufs, i);
	}
	
	// garbage songs like: A-Maze-Ing.sid use more cycles (at least in some initial run) than what is available in 
	// one frame (e.g. 25395 cycles for "one play").. let that kind of shit "PLAY" run to the end (within reasonable limits)
	if (valid_pc) {
		int count= 0;
		while((valid_pc= cpuClock()) && (count < 60000)) { count++; vicClock(); ciaClock(); SID::clockAll();cpuClockSystem();	} // just run until it returns
	}
}

uint8_t Core::runOneFrame(int16_t *synth_buffer, int16_t **synth_trace_bufs, uint16_t samples_per_call) {
	SID::resetGlobalStatistics();

	ciaUpdateTOD(envCurrentSongSpeed());
	
	if (envIsRSID()) {
		runEmulation(synth_buffer, synth_trace_bufs, samples_per_call);
	} else {
		if (envIsTimerDrivenPSID()) {
			runEmuTimerPSID(synth_buffer, synth_trace_bufs, samples_per_call);
		} else {
			runEmuRasterPSID(synth_buffer, synth_trace_bufs, samples_per_call);
		}
	}
	return 0;
}

void Core::loadSongBinary(uint8_t *src, uint16_t dest_addr, uint16_t len) {
	memCopyToRAM(src, dest_addr, len);

	// backup initial state for use in 'track change'	
	memCopyFromRAM(_memory_snapshot, 0, MEMORY_SIZE);	
}

void Core::startupSong(uint32_t sample_rate, uint8_t ntsc_mode, uint8_t compatibility, uint16_t *init_addr, 
							uint16_t load_end_addr, uint16_t play_addr, uint8_t actual_subsong) {
	
	reset(sample_rate, ntsc_mode, compatibility);
	
	// restore original mem image.. previous "init_addr" run may have corrupted the state
	memCopyToRAM(_memory_snapshot, 0, MEMORY_SIZE);

	hackIfNeeded(init_addr);
	
	memSetDefaultBanksPSID(envIsRSID(), (*init_addr), load_end_addr);	// PSID crap
		
	cpuReset((*init_addr), actual_subsong);	// set starting point for emulation	

	if (envIsPSID()) {
		// run the PSID "init" routine
		while (cpuClock()) {
			if (cpuCycles() >= CYCLELIMIT ) {
				EM_ASM_({ console.log('ERROR: PSID INIT hangs');});	// less mem than inclusion of fprintf
				return;
			}
			// this is probably overkill for PSID crap..
			vicClock(); 
			ciaClock(); 
			SID::clockAll();
			cpuClockSystem();
		}

		_timer_psid_pc= 0;	// PSID specific

		ciaReset60HzPSID();

		memResetBanksPSID(envIsPSID(), play_addr);
		_psid_bank_setting= memReadRAM(0x1); // test-case: Madonna_Mix.sid		
	}
}


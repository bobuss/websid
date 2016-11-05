/*
* Poor man's emulation of the C64's CIA timers.
*
* <p>Tiny'R'Sid (c) 2016 J.Wothke
* <p>version 0.81
* 
* <p>The CIA timer emulation is still strongly rooted in the
* original (PSID centric) implementation approach of the old TinySid:
* "Periodically some music player routine is invoked and the emu
* then uses whatever set of SID settings it finds to synthesize 
* sample data for the complete interval from the previous to
* the current music player routine call (e.g. for 1/60sec)."
*
* <p>In this scenario the timers are typically used for statically
* configured IRQ intervals, and future timer underruns can be easily
* predicted. This is still the base assumption of the below impl and
* it works well for about 98% of the tens of thousands of available
* sid-music files. To a certain extent the approach even works 
* when used for NMIs. 
*
* <p>The flaws of the approach surface when timers are not just used 
* as triggers but when code tries to poll for a timer's current counter
* value - which is "out of scope" of the "trigger prediction" impl (and
* a separate impl - see 'pollcia' below - was added as a hack).
*
* <p>However other problems arise when the music program is sufficiently 
* complex, or ill-behaved: e.g. mix of main/IRQ/NMI manipulating 
* respective timer settings on the fly. Add some NMI/IRQ code that 
* doesn't return but instead expects to be interrupted and the whole 
* "predictive" approach is clearly outgunned. The only solution to 
* handle these kind of scenarios would be a cycle-by-cycle emulation. 
*
* <p>Since that would mean a rewrite of more than just the CIA emu, 
* lets just keep what we have..
*
* todo: - add "Force Load" support to actually reset timer counter (see Dx0e/f) 
*
* Terms of Use: This software is licensed under a CC BY-NC-SA 
* (http://creativecommons.org/licenses/by-nc-sa/4.0/).
*/

#include "cia.h"

#include "env.h"		// global env: envIsPSID()
#include "memory.h"
#include "cpu.h"		// cpuTotalCycles()

#define ADDR_CIA1 0xdc00
#define ADDR_CIA2 0xdd00

// *********************** hacks *********************************************
static uint8_t dummyDC04;
static uint8_t nmiVectorHack= 0;

void ciaSetNmiVectorHack(){
	nmiVectorHack= 1;
}

// *********************** "regular" / predictive CIA simulation ***************

// value bigger than any 16-bit counter for easy comparison
uint32_t STOPPED= 0x1ffffff;	

// next interrupt not on this screen; use value bigger than any 
// 16-bit counter for easy comparison
static uint32_t failMarker;	

struct timer {
	/*
	implementation info: 
		-D*0D (interrupt control and status): "io_area" contains the "write" 
				version, i.e. the mask - the "read" version is managed below
		-D*04 - D*07 (timers): latch values are managed below, "memory" 
				contains "read version" (current counter)
				always use the access methods below
	*/
	uint16_t 	memoryAddress;
	
    struct timerState {
		// initially set wait-time (CPU cycles only for A, CPU cycles 
		// or TimerA underflows for CPU cycles or TimerA underflows B)
		uint16_t 	timerLatch;
		uint8_t	timerSuspended;	// supress repeated 0 timers..
	} ts[2];	
	
	uint8_t	timerInterruptStatus;	// read version of the respective DX0D register
};

static struct timer cia[2];


static int isBLinkedToA(struct timer *t) {
	// '10' is the only "special mode currently implemented here
	return ((memReadIO((*t).memoryAddress + 0x0f)&0x60) == 0x40);
}

// the current counter of this timer
static uint16_t getTimerCounter(struct timer *t, uint8_t timerIdx) {
	uint16_t addr= (*t).memoryAddress + ((timerIdx==TIMER_A) ? 0x04 : 0x06);
	
	return (memReadIO(addr)|(memReadIO(addr+1)<<8));
}

static uint8_t* getSuspended(struct timer *t, uint8_t timerIdx) {
	return &((*t).ts[timerIdx].timerSuspended);
}

// the current counter of this timer
static uint16_t getTimerNextCounter(struct timer *t, uint8_t timerIdx) {
	uint16_t counter= getTimerCounter(t, timerIdx);
	if (counter == 0) {
		if (*getSuspended(t, timerIdx)) {
			return failMarker;			// 0 counter must be reset >0 before it is reused..
		} else {
			*getSuspended(t, timerIdx)= 1;
			return counter;
		}
	}
	return counter;
}

static uint32_t getTimerLatch(struct timer *t, uint8_t timerIdx) {
	return 	(*t).ts[timerIdx].timerLatch;
}

// bootstrap using current memory settings..
static void initTimerData(uint16_t memoryAddress, struct timer *t) {
	(*t).memoryAddress= memoryAddress;
	
	uint16_t timerA= getTimerCounter(t, TIMER_A);		
	(*t).ts[TIMER_A].timerLatch= timerA;
	(*t).ts[TIMER_A].timerSuspended= 0;
	
	uint16_t timerB= getTimerCounter(t, TIMER_B);
	(*t).ts[TIMER_B].timerLatch= timerB;
	(*t).ts[TIMER_B].timerSuspended= 0;
	
	(*t).timerInterruptStatus= 0;
}

static void setInterruptMask(struct timer *t, uint8_t value) {
	// handle updates of the CIA interrupt control mask
	uint16_t addr= (*t).memoryAddress + 0x0d;
	
	if (value&0x80) {	// set mask bits
		memWriteIO(addr, memReadIO(addr)|(value&0x1f));
		
	} else {			// clear mask bits
		memWriteIO(addr, memReadIO(addr)&(~(value&0x1f)));
	}			
}

// read version of the respective DX0D register
static uint8_t getInterruptStatus(struct timer *t) {
	uint8_t retVal= (*t).timerInterruptStatus;
		
	(*t).timerInterruptStatus= 0;	// read clears status
	return retVal;
}

// "running" means "not stopped"
static int isTimerStarted(struct timer *t, uint8_t timerIdx) {
	return ((memReadIO((*t).memoryAddress + (0x0e + timerIdx))&0x1) != 0) 
			&& (!(*t).ts[timerIdx].timerSuspended || 
				((timerIdx == TIMER_B) && isBLinkedToA(t) && isTimerStarted(t, TIMER_A)));
}

// the current counter of this timer / STOPPED if counter is not running
static uint32_t getTimerRunningCounter(struct timer *t, uint8_t timerIdx) {
	if ((!(*t).ts[timerIdx].timerSuspended) && isTimerStarted(t, timerIdx)) {
		return getTimerNextCounter(t, timerIdx);
	}
	return STOPPED;
}

static void stopTimer(struct timer *t, uint8_t timerIdx) {
	uint16_t addr= (*t).memoryAddress + (0x0e + timerIdx);
	memWriteIO(addr, memReadIO(addr)&(~0x1));
}

// "armed" means an underflow if this timer will trigger an interrupt
static int isTimerArmed(struct timer *t, uint8_t timerIdx) {
	return (memReadIO((*t).memoryAddress + 0x0d)&(timerIdx==TIMER_A ? 0x1 : 0x2)) != 0;
}

static void signalTimerInterrupt(struct timer *t) {
	(*t).timerInterruptStatus|= 0x80;
}

/*
* One-Shot:   Timer will count down from the latched value to zero, generate an interrupt, 
*             reload the latched value, then stop.
* Continuous: Timer will count down from the latched value to zero, generate an interrupt, 
*             reload the latched value, and repeat the procedure continously.
*/
static int isTimerContinuous(struct timer *t, uint8_t timerIdx) {
	return (memReadIO((*t).memoryAddress + (0x0e + timerIdx))&0x8) == 0;
}

static void intSignalTimerUnderflow(struct timer *t, uint8_t timerIdx) {
	(*t).timerInterruptStatus|= (timerIdx==TIMER_A) ? 0x01 : 0x02;
}

void ciaSignalUnderflow(uint8_t ciaIdx, uint8_t timerIdx) {
	struct timer *t= &(cia[ciaIdx]);
	intSignalTimerUnderflow(t, timerIdx);
}

static void reloadTimer(struct timer *t, uint8_t timerIdx) {
	uint16_t addr= (*t).memoryAddress + ((timerIdx==TIMER_A) ? 0x04 : 0x06);
	struct timerState *in= &(*t).ts[timerIdx];
	
	memWriteIO(addr, (*in).timerLatch&0xff);
	memWriteIO(addr+1, (*in).timerLatch >>8);	
	if ((*in).timerLatch >0) {
		(*in).timerSuspended= 0;
	}
	intSignalTimerUnderflow(t, timerIdx);	
}


// the current counter of this timer
static void reduceTimerCounter(struct timer *t, uint8_t timerIdx, uint16_t diff) {
	uint16_t newCount= getTimerCounter(t, timerIdx) - diff;
	
	uint16_t addr= (*t).memoryAddress + (timerIdx==TIMER_A ? 0x04 : 0x06);
	memWriteIO(addr, newCount&0xff);
	memWriteIO(addr+1, newCount>>8);
}

static void setLatch(struct timer *t, uint8_t timerIdx, uint16_t value) {
	(*t).ts[timerIdx].timerLatch= value;
	
	if (value > 0) {
		(*t).ts[timerIdx].timerSuspended= 0;
	}
}

static void setTimer(struct timer *t, uint16_t offset, uint8_t value) {
	switch (offset) {
		case 0x04:
			setLatch(t, TIMER_A, ((*t).ts[TIMER_A].timerLatch&0xff00) | value);
			break;
		case 0x05:
			setLatch(t, TIMER_A, ((*t).ts[TIMER_A].timerLatch&0xff) | (value<<8));
			break;
		case 0x06:
			setLatch(t, TIMER_B, ((*t).ts[TIMER_B].timerLatch&0xff00) | value);
			break;
		case 0x07:
			setLatch(t, TIMER_B, ((*t).ts[TIMER_B].timerLatch&0xff) | (value<<8));
			break;
	}
	memWriteIO((*t).memoryAddress+offset, value);	// also current counter (i.e. always "force load")	
}

/*
* Moves to the next timer event (if any) which will occur within the specific
* window of time.
* 
* <p>The function updates the internal state of the "CIA" timers. Simulates a 
* fast forward to the next interrupt or the end of the timeLimit.
*
* <p> use more generic impl to avoid copy/paste
*
* @return failMarker: timeLimit was reached / [positive number] wait time in 
*					 cycles until the interrupt occurs
*/
static uint32_t intForwardToNextCiaInterrupt(struct timer *t, uint32_t timeLimit) {
	uint32_t waited= 0;
		
	for(;;) {
		if (!(isTimerStarted(t, TIMER_A) || isTimerStarted(t, TIMER_B))) {
			waited= failMarker; 
			break;
		}		
		if (!(isTimerArmed(t, TIMER_A) || isTimerArmed(t, TIMER_B))) {
			// todo: the timers should be updated even if they are not "armed" (but running)
			waited= failMarker; 	
			break;
		}		
		
		if (isBLinkedToA(t) && isTimerStarted(t, TIMER_B)) {
			// unfortunately this really is used - e.g. in Graphixmania_2_part_6.sid
			if (!isTimerStarted(t, TIMER_A)) {
				waited= failMarker;				// without A nothing will happen here..
				break;
			} else {
				uint32_t cA= getTimerRunningCounter(t, TIMER_A);
				if ((waited+cA) >= timeLimit) {		
					// handle remaining counter in next screen
					uint16_t timeLeft= timeLimit-waited;
					reduceTimerCounter(t, TIMER_A, timeLeft);
					waited= failMarker;				// no interrupts in the specified timeLimit
					break;
				} else {
					// persume A in never "Armed" in this scenario
					waited+= cA;
					reloadTimer(t, TIMER_A);		
					
					if (!isTimerContinuous(t, TIMER_A)) {
						stopTimer(t, TIMER_A);
					}
					
					uint32_t cB= getTimerCounter(t, TIMER_B);
					if (cB == 0) {	// oddly a linked B timer can actually start with 0 
									//(which seems to mean that it triggers directly)	
						reloadTimer(t, TIMER_B);
						
						if (!isTimerContinuous(t, TIMER_B)) {
							stopTimer(t, TIMER_B);
						}
						if (isTimerArmed(t, TIMER_B)) {
							signalTimerInterrupt(t);
							break;
						}
					} else {
						reduceTimerCounter(t, TIMER_B, 1);
					}				
				}			
			}
		} else {
			// handle regular independent counters (at least one of which is running - see check on top)
			uint32_t cA= getTimerRunningCounter(t, TIMER_A);
			uint32_t cB= getTimerRunningCounter(t, TIMER_B);

			if (cA == cB) {
				// both timers have underflow at same time (both timers are running - otherwise we'd not be in this case)
				if ((waited+cB) >= timeLimit) {					// handle remaining counter in next screen
					uint16_t timeLeft= timeLimit-waited;
					reduceTimerCounter(t, TIMER_B, timeLeft);
					reduceTimerCounter(t, TIMER_A, timeLeft);
					waited= failMarker;							// no interrupts in the specified timeLimit
					break;
				} else {										// still within the time limit
					waited+= cB;
					reloadTimer(t, TIMER_B);
					reloadTimer(t, TIMER_A);
					
					if (!isTimerContinuous(t, TIMER_B)) {
						stopTimer(t, TIMER_B);
					}
					if (!isTimerContinuous(t, TIMER_A)) {
						stopTimer(t, TIMER_A);
					}
					if (isTimerArmed(t, TIMER_B) || isTimerArmed(t, TIMER_A)) {
						signalTimerInterrupt(t);
						break;
					}
				}
			} else {
				uint32_t count1, count2;
				uint8_t timer1, timer2;
				if (cA < cB) {
					count1= cA;
					timer1= TIMER_A;
					count2= cB;
					timer2= TIMER_B;
				} else {
					count1= cB;
					timer1= TIMER_B;
					count2= cA;
					timer2= TIMER_A;
				}
				
				// timer1 is next (before timer2)
				if ((waited + count1) >= timeLimit) {			// handle remaining counter in next screen
					uint16_t timeLeft= timeLimit-waited;
					reduceTimerCounter(t, timer1, timeLeft);
					if (count2 != STOPPED) {
						reduceTimerCounter(t, timer2, timeLeft);
					}
					waited= failMarker;							// no interrupts in the specified timeLimit
					break;
				} else {										// still within the time limit
					waited+= count1;
					reloadTimer(t, timer1);
					
					if (count2 != STOPPED) {
						reduceTimerCounter(t, timer2, count1);
					}
					if (!isTimerContinuous(t, timer1)) {
						stopTimer(t, timer1);
					}
					if (isTimerArmed(t, timer1)) {
						signalTimerInterrupt(t);
						break;
					}
				}	
			}
		}
	}
	return waited;
}

uint32_t ciaForwardToNextInterrupt(uint8_t ciaIdx, uint32_t timeLimit) {
	struct timer *t= &(cia[ciaIdx]);
	return  intForwardToNextCiaInterrupt(t, timeLimit);
}

int ciaIsActive(uint8_t ciaIdx) {
	struct timer *t= &(cia[ciaIdx]);
	return (isTimerStarted(t, TIMER_A) && isTimerArmed(t, TIMER_A)) 
				|| (isTimerStarted(t, TIMER_B) && isTimerArmed(t, TIMER_B));
}

// -----------------------------  CIA timer I/O -------------------------------------------

// hack: poor man's TOD sim (only secs & 10th of sec), see Kawasaki_Synthesizer_Demo.sid
static uint32_t todInMillies= 0;
static uint32_t getTimeOfDayMillis() {
	return todInMillies;
}

static void updateTimeOfDay10thOfSec(uint8_t value) {
	todInMillies= ((uint32_t)(todInMillies/1000))*1000 + value*100;
}
static void updateTimeOfDaySec(uint8_t value) {
	todInMillies= value*1000 + (todInMillies%1000);	// ignore minutes, etc
}

void ciaUpdateTOD(uint8_t songSpeed) {
	todInMillies+= (songSpeed ? 17 : 20);	
}


/**************************************************************************************************
	below add-on HACK for "main loop timer polling" is independent of the above! 

	This is a hack to support specific timer polling from main loop as done by PollyTracker
	e.g. see Instantfunk.sid (the usage pattern is very specific and the below hack 
	covers exactly that - and nothing more). Actually PollyTracker also reads timer 
	counters to make +1 cycle timing adjustments: since it doesn't make much difference 
	to the playback quality - but a respective add-on feature might break existing
	stuff - it is not implemented.
***************************************************************************************************/

struct pollcia {
	uint8_t isStarted;
	uint32_t baseCycles;
	uint16_t latch;
	uint16_t nextLatch;	
	uint8_t stopStatus;
};
static struct pollcia dcia[4];


static void simWriteTABLO(uint8_t ciaIdx, uint8_t timerIdx, uint8_t val) {
	struct pollcia *c= &(dcia[ciaIdx*2+timerIdx]);
	c->nextLatch=  (c->nextLatch & 0xff00) | (0x00ff & val);
}

static uint8_t intReadICR(uint8_t ciaIdx, uint8_t timerIdx) {	
	// calc timer underflow status (there is no timer counted down, instead
	// the "time elapsed" since the start of the countdown is tracked)
	struct pollcia *c= &(dcia[ciaIdx*2+timerIdx]);

	if (!c->isStarted ) {
		uint8_t readOnce= c->stopStatus;
		c->stopStatus= 0;
		return readOnce;
	}	
	uint32_t diff= cpuTotalCycles() - c->baseCycles;	
	if (diff >= c->latch) {
		uint32_t overflow= diff - c->latch;		
		c->baseCycles= cpuTotalCycles() - overflow;
		
		// note: status bits are cleared "on read": since base time has  
		// just been updated this status has been cleared
				
		c->latch= c->nextLatch; // underflow triggers "reload" of the counter
		
		return (timerIdx & 1) + 1;
	} else {
		return 0;
	}
}
static uint8_t simReadICR_1() {
	// Interrupt Control und Status	- $DC0D
	return intReadICR(0, 0) | intReadICR(0, 1);
}
static uint8_t simReadICR_2() {
	// Interrupt Control und Status	- $DD0D
	return intReadICR(1, 0) | intReadICR(1, 1);
}
static void simWriteCRAB(uint8_t ciaIdx, uint8_t timerIdx, uint8_t val) {
	// Control Timer: DC0E/F DD0E/F  write start/stop flag (other flags NOT implemented)

	uint8_t i= ciaIdx*2+timerIdx;
	struct pollcia *c= &(dcia[i]);
		
	if (val & 0x1) {	// ignore other flags here
		// start timer
		if (!c->isStarted ) {
			c->baseCycles= cpuTotalCycles();	// "load latch" here equals "reset base time"
					
			c->latch= c->nextLatch;	
					
			c->isStarted= 1;
		} else {
			// start of already running timer is a NOP
		}
	} else {
		if (!c->isStarted) {
			// stop of already stopped timer is a NOP
		} else {
			/* 
			stop (in case there was already an interrupt before, make
			sure the interrupt status is still updated)

			1st check if there is a timer underflow (once stopped the
			logic in simReadICR* will no longer calc and therefore it must be done here)
			*/
			 if (c->isStarted) { c->stopStatus= intReadICR(ciaIdx, timerIdx); }			
		}		
		c->isStarted= 0;
	}
}
static uint8_t simReadCRAB(uint8_t ciaIdx, uint8_t timerIdx) {
	// DC0E/F DD0E/F  read start/stop bit (other flags NOT implemented)
	struct pollcia *c= &(dcia[ciaIdx*2+timerIdx]);
	return c->isStarted;
}

static void simWriteTimer(uint16_t addr, uint8_t value) {
	switch (addr) {
		case 0xdc04:	// targetted song are only setting LO byte
		case 0xdc06:
			simWriteTABLO(0, ((addr-0xdc04) >>1), value);
			break;
		case 0xdd04:
		case 0xdd06:
			simWriteTABLO(1, ((addr-0xdd04) >>1), value);
			break;
			
		case 0xdc0e:	
		case 0xdc0f:	
			simWriteCRAB(0, (addr-0xdc0e), value);
			break;
		case 0xdd0e:	
		case 0xdd0f:	
			simWriteCRAB(1, (addr-0xdd0e), value);
			break;
	} 
}

/**************************************************************************************************/

uint8_t useCiaPollingHack() {
	return cpuGetProgramMode() == MAIN_OFFSET_MASK;	// only tested for main-loop yet
}

uint8_t ciaReadMem(uint16_t addr) {
	switch (addr) {
		// CIA	
		case 0xdc01:
			// some songs use this as an exit criteria.. see Master_Blaster_intro.sid
			return 0xff;
			
		case 0xdc04:
			if (envIsPSID()) {
				/* 
				hack for Delta_Mix-E-Load_loader.sid which uses counter to control the 
				progress of its melody: PSID is invoked via CIA1 timer.. however regular 
				timing handling (e.g. based on used cycles) does not seem to work - but 
				this hack does..
				*/
				dummyDC04+=3;
				return dummyDC04;
			} 
			if (nmiVectorHack) {
				/*
				wonderland_xii*.sid hack: NMI routines at $8xx, $9xx, ... 
				set the low-byte to the next routine to be called in 0xdc03 and it is 
				the hi-byte here that would be changed by the timer to point it 
				to the correct $8,$9,etc offset.. we just use one hardcoded offset here..
				*/
				return 0x08;							
			}
			// songs like LMan - Vortex.sid actually place a JMP at this location.. so
			// the above hack MUST NOT be always enabled
			 return memReadIO(addr);
		case 0xdc06:
			/*
			hack originally used for Storebror.sid.. but apparently other songs also 
			"benefit" from it (e.g. Uwe Anfang's stuff)...  always use 0x08xx NMI vector 
			(our timing is too imprecise to reliably calc the required values between 
			0x08 and 0x0e.. (other songs - e.g. Hunters_Moon.sid - are using 0x02-0x09) 
			but since jitter is the least of our problems, there is no need for the 
			respective timing logic anyway)
			*/
			return 0x08;	

		// fixme: also used for write.. clearing the status here then might be a problem:
		case 0xdc0d:
			if (useCiaPollingHack()) { return simReadICR_1(); }
			return getInterruptStatus(&(cia[0]));	
		case 0xdd0d:
			if (useCiaPollingHack()) { return simReadICR_2(); }
			return getInterruptStatus(&(cia[1]));
		case 0xdc0e:
		case 0xdc0f:
			if (useCiaPollingHack()) { return simReadCRAB(0, addr-0xdc0e); }
			return memReadIO(addr);
		case 0xdd0e:
		case 0xdd0f:
			if (useCiaPollingHack()) { return simReadCRAB(1, addr-0xdd0e); }
			return memReadIO(addr);
		case 0xdc08: 
			// TOD tenth of second
			return (getTimeOfDayMillis()%1000)/100;
		case 0xdc09: 
			// TOD second
			return ((uint16_t)(getTimeOfDayMillis()/1000))%60;
	}
	return memReadIO(addr);
}

void ciaWriteMem(uint16_t addr, uint8_t value) {
	addr&=0xFF0F;	// handle the 16 mirrored CIA registers just in case
	
	simWriteTimer(addr, value);
	
	switch (addr) {
		case 0xdc0d:
			setInterruptMask(&(cia[0]), value);
			break;
		case 0xdd0d:
			setInterruptMask(&(cia[1]), value);
			break;
		case 0xdc04:
		case 0xdc05:
		case 0xdc06:
		case 0xdc07:	
			setTimer(&(cia[0]), addr-ADDR_CIA1, value);
			break;	
		case 0xdc08: 
			updateTimeOfDay10thOfSec(value);
			break;
		case 0xdc09: 
			updateTimeOfDaySec(value);
			break;						
		case 0xdd04:
		case 0xdd05:
		case 0xdd06:
		case 0xdd07:
			setTimer(&(cia[1]), addr-ADDR_CIA2, value);
			break;
		default:
			memWriteIO(addr, value);
			break;
	}
}

void ciaReset(uint32_t f) {
	failMarker= f;

	initTimerData(ADDR_CIA1, &(cia[0]));
	initTimerData(ADDR_CIA2, &(cia[1]));
	
	// reset hacks
	nmiVectorHack= 0;
	dummyDC04= 0;
	fillMem((uint8_t*)&dcia,0,sizeof(dcia));

	todInMillies= 0;
}
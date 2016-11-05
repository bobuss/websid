/*
* Poor man's emulation of the C64's CIA timers.
*
* <p>Tiny'R'Sid (c) 2012 J.Wothke
* 
* <p>Only those features actually observed in RSID files have been implemented, i.e. simple 
* cycle counting and timer B to timer A linking.
*
* todo: - add "Force Load" support to actually reset timer counter (see Dx0e/f) 
*
* Terms of Use: This software is licensed under a CC BY-NC-SA 
* (http://creativecommons.org/licenses/by-nc-sa/4.0/).
*/

#include "nanocia.h"
#include "rsidengine.h"

// from sidengine.c FIXME cleanup dependencies
extern uint32_t sAbsCycles;
extern uint8_t isMainLoopPolling();

uint32_t STOPPED=0x1ffffff;	// value bigger than any 16-bit counter for easy comparison
uint32_t NO_INT=0x1ffffff;		// next interrupt not on this screen; value bigger than any 16-bit counter for easy comparison

struct timer cia[2];

uint8_t TIMER_A= 0;
uint8_t TIMER_B= 1;


int isBLinkedToA(struct timer *t) {
	// '10' is the only "special mode currently implemented here
	return ((io_area[(*t).memoryAddress + 0x0f]&0x60) == 0x40);
}

// the current counter of this timer
uint16_t getTimer_Counter(struct timer *t, uint8_t timerId) {
	uint16_t addr= (*t).memoryAddress + ((timerId==TIMER_A) ? 0x04 : 0x06);
	
	return (io_area[addr]|(io_area[addr+1]<<8));
}

uint8_t* getSuspended(struct timer *t, uint8_t timerId) {
	return &((*t).ts[timerId].timer_suspended);
}

// the current counter of this timer
uint16_t getTimer_NextCounter(struct timer *t, uint8_t timerId) {
	uint16_t counter= getTimer_Counter(t, timerId);
	if (counter == 0) {
		if (*getSuspended(t, timerId)) {
			return NO_INT;			// 0 counter must be reset >0 before it is reused..
		} else {
			*getSuspended(t, timerId)= 1;
			return counter;
		}
	}
	return counter;
}

static uint32_t getTimerLatch(struct timer *t, uint8_t timerId) {
	return 	(*t).ts[timerId].timer_latch;
}

// bootstrap using current memory settings..
void initTimerData(uint16_t memoryAddress, struct timer *t) {
	(*t).memoryAddress= memoryAddress - 0xd000;	// we access the separate 'io_area' not the regular 'memory'..
	
	uint16_t timerA= getTimer_Counter(t, TIMER_A);		
	(*t).ts[TIMER_A].timer_latch= timerA;
	(*t).ts[TIMER_A].timer_suspended= 0;
	
	uint16_t timerB= getTimer_Counter(t, TIMER_B);
	(*t).ts[TIMER_B].timer_latch= timerB;
	(*t).ts[TIMER_B].timer_suspended= 0;
	
	(*t).timer_interruptStatus= 0;
}

void setInterruptMask(struct timer *t, uint8_t value) {
	// handle updates of the CIA interrupt control mask
	if (value&0x80) {	// set mask bits
		io_area[(*t).memoryAddress + 0x0d]|= (value&0x1f);
	} else {			// clear mask bits
		io_area[(*t).memoryAddress + 0x0d]&= (~(value&0x1f));
	}			
}

// read version of the respective DX0D register
uint8_t getInterruptStatus(struct timer *t) {
	uint8_t retVal= (*t).timer_interruptStatus;
		
	(*t).timer_interruptStatus= 0;	// read clears status
	return retVal;
}

// "running" means "not stopped"
static int isTimer_Started(struct timer *t, uint8_t timerId) {
	return ((io_area[(*t).memoryAddress + (0x0e + timerId)]&0x1) != 0) && (!(*t).ts[timerId].timer_suspended || 
		((timerId == TIMER_B) && isBLinkedToA(t) && isTimer_Started(t, TIMER_A)));
}

// the current counter of this timer / STOPPED if counter is not running
uint32_t getTimer_RunningCounter(struct timer *t, uint8_t timerId) {
	if ((!(*t).ts[timerId].timer_suspended) && isTimer_Started(t, timerId)) {
		return getTimer_NextCounter(t, timerId);
	}
	return STOPPED;
}

void stopTimer(struct timer *t, uint8_t timerId) {
	io_area[(*t).memoryAddress + (0x0e + timerId)] &= (~0x1);
}

// "armed" means an underflow if this timer will trigger an interrupt
static int isTimer_Armed(struct timer *t, uint8_t timerId) {
	return (io_area[(*t).memoryAddress + 0x0d]&(timerId==TIMER_A ? 0x1 : 0x2)) != 0;
}

static void signalTimerInterrupt(struct timer *t) {
	(*t).timer_interruptStatus|= 0x80;
}

/*
* One-Shot:   Timer will count down from the latched value to zero, generate an interrupt, reload the latched value,
*             then stop.
* Continuous: Timer will count down from the latched value to zero, generate an interrupt, reload the latched value,
*             and repeat the procedure continously.
*/
int isTimer_Continuous(struct timer *t, uint8_t timerId) {
	return (io_area[(*t).memoryAddress + (0x0e + timerId)]&0x8) == 0;
}

void signalTimerUnderflow(struct timer *t, uint8_t timerId) {
	(*t).timer_interruptStatus|= (timerId==TIMER_A) ? 0x01 : 0x02;
}

void reloadTimer(struct timer *t, uint8_t timerId) {
	uint16_t addr= (*t).memoryAddress + ((timerId==TIMER_A) ? 0x04 : 0x06);
	struct timerState *in= &(*t).ts[timerId];
	
	io_area[addr]= (*in).timer_latch&0xff;
	io_area[addr+1]= (*in).timer_latch >>8;	
	if ((*in).timer_latch >0) {
		(*in).timer_suspended= 0;
	}
	signalTimerUnderflow(t, timerId);	
}

// the current counter of this timer
void reduceTimer_Counter(struct timer *t, uint8_t timerId, uint16_t diff) {
	uint16_t newCount= getTimer_Counter(t, timerId) - diff;
	
	uint16_t addr= (*t).memoryAddress + (timerId==TIMER_A ? 0x04 : 0x06);
	io_area[addr]= newCount&0xff;
	io_area[addr+1]= newCount>>8;
}

void setLatch(struct timer *t, uint8_t timerId, uint16_t value) {
	(*t).ts[timerId].timer_latch= value;
	
	if (value > 0) {
		(*t).ts[timerId].timer_suspended= 0;
	}
}

void setTimer(struct timer *t, uint16_t offset, uint8_t value) {
	switch (offset) {
		case 0x04:
			setLatch(t, TIMER_A, ((*t).ts[TIMER_A].timer_latch&0xff00) | value);
			break;
		case 0x05:
			setLatch(t, TIMER_A, ((*t).ts[TIMER_A].timer_latch&0xff) | (value<<8));
			break;
		case 0x06:
			setLatch(t, TIMER_B, ((*t).ts[TIMER_B].timer_latch&0xff00) | value);
			break;
		case 0x07:
			setLatch(t, TIMER_B, ((*t).ts[TIMER_B].timer_latch&0xff) | (value<<8));
			break;
	}
	io_area[(*t).memoryAddress+offset]= value;		// and also current counter (i.e. always "force load")	
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
* @return NO_INT: timeLimit was reached / [positive number] wait time in cycles until the interrupt occurs
*/
uint32_t forwardToNextCiaInterrupt(struct timer *t, uint32_t timeLimit) {
	uint32_t waited= 0;
		
	for(;;) {
		if (!(isTimer_Started(t, TIMER_A) || isTimer_Started(t, TIMER_B))) {
			waited= NO_INT; 
			break;
		}		
		if (!(isTimer_Armed(t, TIMER_A) || isTimer_Armed(t, TIMER_B))) {
			waited= NO_INT; 		// todo: the timers should be updated even if they are not "armed" (but running)
			break;
		}		
		
		if (isBLinkedToA(t) && isTimer_Started(t, TIMER_B)) {
			// unfortunately this really is used - e.g. in Graphixmania_2_part_6.sid
			if (!isTimer_Started(t, TIMER_A)) {
				waited= NO_INT;				// without A nothing will happen here..
				break;
			} else {
				uint32_t cA= getTimer_RunningCounter(t, TIMER_A);
				if ((waited+cA) >= timeLimit) {		
					// handle remaining counter in next screen
					uint16_t timeLeft= timeLimit-waited;
					reduceTimer_Counter(t, TIMER_A, timeLeft);
					waited= NO_INT;							// no interrupts in the specified timeLimit
					break;
				} else {
					// persume A in never "Armed" in this scenario
					waited+= cA;
					reloadTimer(t, TIMER_A);		
					
					if (!isTimer_Continuous(t, TIMER_A)) {
						stopTimer(t, TIMER_A);
					}
					
					uint32_t cB= getTimer_Counter(t, TIMER_B);
					if (cB == 0) {	// oddly a linked B timer can actually start with 0 (which seems to mean that it triggers directly)	
						reloadTimer(t, TIMER_B);
						
						if (!isTimer_Continuous(t, TIMER_B)) {
							stopTimer(t, TIMER_B);
						}
						if (isTimer_Armed(t, TIMER_B)) {
							signalTimerInterrupt(t);
							break;
						}
					} else {
						reduceTimer_Counter(t, TIMER_B, 1);
					}				
				}			
			}
		} else {
			// handle regular independent counters (at least one of which is running - see check on top)
			uint32_t cA= getTimer_RunningCounter(t, TIMER_A);
			uint32_t cB= getTimer_RunningCounter(t, TIMER_B);

			if (cA == cB) {
				// both timers have underflow at same time (both timers are running - otherwise we'd not be in this case)
				if ((waited+cB) >= timeLimit) {						// handle remaining counter in next screen
					uint16_t timeLeft= timeLimit-waited;
					reduceTimer_Counter(t, TIMER_B, timeLeft);
					reduceTimer_Counter(t, TIMER_A, timeLeft);
					waited= NO_INT;							// no interrupts in the specified timeLimit
					break;
				} else {									// still within the time limit
					waited+= cB;
					reloadTimer(t, TIMER_B);
					reloadTimer(t, TIMER_A);
					
					if (!isTimer_Continuous(t, TIMER_B)) {
						stopTimer(t, TIMER_B);
					}
					if (!isTimer_Continuous(t, TIMER_A)) {
						stopTimer(t, TIMER_A);
					}
					if (isTimer_Armed(t, TIMER_B) || isTimer_Armed(t, TIMER_A)) {
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
				if ((waited + count1) >= timeLimit) {						// handle remaining counter in next screen
					uint16_t timeLeft= timeLimit-waited;
					reduceTimer_Counter(t, timer1, timeLeft);
					if (count2 != STOPPED) {
						reduceTimer_Counter(t, timer2, timeLeft);
					}
					waited= NO_INT;							// no interrupts in the specified timeLimit
					break;
				} else {									// still within the time limit
					waited+= count1;
					reloadTimer(t, timer1);
					
					if (count2 != STOPPED) {
						reduceTimer_Counter(t, timer2, count1);
					}
					if (!isTimer_Continuous(t, timer1)) {
						stopTimer(t, timer1);
					}
					if (isTimer_Armed(t, timer1)) {
						signalTimerInterrupt(t);
						break;
					}
				}	
			}
		}
	}
	return waited;
}

int isTimerActive(struct timer *t) {
	return (isTimer_Started(t, TIMER_A) && isTimer_Armed(t, TIMER_A)) || (isTimer_Started(t, TIMER_B) && isTimer_Armed(t, TIMER_B));
}

void resetCiaTimer() {
	initTimerData(ADDR_CIA1, &(cia[0]));
	initTimerData(ADDR_CIA2, &(cia[1]));
	
}
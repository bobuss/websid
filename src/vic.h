/*
 * This contains everything to do with minimal VIC emulation.
 * 
 * <p>Tiny'R'Sid (c) 2015 Jürgen Wothke
 * <p>version 0.81
 * 
 * Terms of Use: This software is licensed under a CC BY-NC-SA 
 * (http://creativecommons.org/licenses/by-nc-sa/4.0/).
 */
#ifndef TINYRSID_VIC_H
#define TINYRSID_VIC_H

#include "base.h"

void vicReset();
	
// interface used to interact with VIC
void vicStartRasterSim(uint32_t rasterPosInCycles);
void vicSimRasterline();
uint16_t vicGetRasterline();
uint8_t vicIsIrqActive();
uint32_t vicForwardToNextRaster();
	
// memory access interface (for memory.c)
void vicWriteMem(uint16_t addr, uint8_t value);
uint8_t vicReadMem(uint16_t addr);

#endif
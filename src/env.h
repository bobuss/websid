/*
 * This provides access to the *.sid file specific environment that 
 * the emulation runs in.
 * 
 * <p>Currently a respective implementation is provided by sidplayer.c
 *
 * <p>Tiny'R'Sid (c) 2015 Jürgen Wothke
 * <p>version 0.81
 * 
 * Terms of Use: This software is licensed under a CC BY-NC-SA 
 * (http://creativecommons.org/licenses/by-nc-sa/4.0/).
 */
 
#ifndef TINYRSID_PLAYER_H
#define TINYRSID_PLAYER_H

#include "base.h"

// *.sid file version
uint8_t envIsRSID();
uint8_t envIsPSID();
void envSetPsidMode(uint8_t m);

// PSID stuff
int8_t envIsRasterDrivenPsid();
int8_t envIsTimerDrivenPsid();

// where it starts
uint16_t envSidPlayAddr();

// playback speed according to meta data
uint8_t envCurrentSongSpeed();

// timing info derived from the meta data
uint32_t envCyclesPerScreen();
uint32_t envCyclesPerSec();
uint8_t envCyclesPerRaster();
uint16_t envLinesPerScreen();

uint16_t envNumberOfSamplesPerCall();

#endif
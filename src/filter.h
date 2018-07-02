/*
* Poor man's emulation of the C64's SID.
*
* <p>Tiny'R'Sid (c) 2018 J.Wothke
* <p>version 0.81
* 
* Terms of Use: This software is licensed under a CC BY-NC-SA 
* (http://creativecommons.org/licenses/by-nc-sa/4.0/).
*/
#ifndef TINYRSID_FILTER_H
#define TINYRSID_FILTER_H

#include "base.h"


/**
* This class handles the filter of a SID chip.
*
* It is a construct exclusively used by the SID class and access is restricted accordingly.
*/
class Filter {
protected:
	friend class SID;
	Filter(class SID *sid);
	
	void reset(uint32_t sampleRate);
	int32_t getOutput(int32_t *in, int32_t *out, double cutoff, double resonance);
	uint8_t isActive(uint8_t filterVoice);
	void filterSamples(uint8_t *digiBuffer, uint32_t len, int8_t voice);
	double runFilter(double in, double output, double *prevbandpass, double *prevlowpass, double cutoff, double resonance);
	void setupFilterInput(double *cutoff, double *resonance, uint8_t *resFtv, uint8_t *ffreqlo, uint8_t *ffreqhi);
	void routeSignal(int32_t *voiceOut, int32_t *outo, int32_t *outf, uint8_t voice, uint8_t *voiceEnabled);
	void syncState(uint8_t *ftpVol, uint8_t *resFtv);

private:
private:
	friend struct FilterState* getState(Filter *e);

	void *_state;	// don't want this header file cluttered with all the implementation details..
	class SID* _sid;
};


#endif
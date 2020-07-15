/*
* Poor man's emulation of the SID's digi sample playback features.
*
* WebSid (c) 2019 Jürgen Wothke
* version 0.94
*
* Terms of Use: This software is licensed under a CC BY-NC-SA 
* (http://creativecommons.org/licenses/by-nc-sa/4.0/).
*/

#ifndef WEBSID_DIGI_H
#define WEBSID_DIGI_H

extern "C" {
#include "base.h"
}

// FM detector states
typedef enum {
    FreqIdle=0,
    FreqPrep=1,
    FreqSet=2,
	
    FreqVariant1=3,
    FreqVariant2=4,

} FreqDetectState;

// PWM detector states
typedef enum {
    PulseIdle=0,
	// variant 2
    PulsePrep=1,
    PulseConfirm=2,
	
	// variant 2
	PulsePrep2= 3,
	PulseConfirm2= 4
} PulseDetectState;


class DigiDetector {
protected:
	friend class SID;
	
	DigiDetector(class SID *sid);
	
	// setup
	void reset(uint32_t clock_rate, uint8_t is_rsid, uint8_t compatibility);
	void resetCount();

	// result accessors
	int32_t getSample(); // get whatever digi-sample has last been written (as signed 16-bit)
	uint8_t getSource();
	int32_t genPsidSample(int32_t sample_in);	// legacy PSID digis

	// detection of sample playback
	uint8_t detectSample(uint16_t addr, uint8_t value);

	void setEnabled(uint8_t value);

	/**
	* @param digi_out	returns digi signal, e.g. for tracing purposes
	* @param outf	filtered output that digi_out is added to if necessary
	* @param outo	unfiltered output that digi_out is added to if necessary
	*/
	void routeDigiSignal(class Filter *filter, int32_t *digi_out, int32_t *outf, int32_t *outo);
	
	// diagnostics
	DigiType getType();
	const char * getTypeDesc();
	uint16_t getRate();
private:
	void recordSample(uint8_t sample, uint8_t voice);
	uint8_t assertSameSource(uint8_t voice_plus);
	
	uint8_t isWithinFreqDetectTimeout(uint8_t voice);
	uint8_t recordFreqSample(uint8_t voice, uint8_t sample);
	uint8_t handleFreqModulationDigi(uint8_t voice, uint8_t reg, uint8_t value);
	
	uint8_t isWithinPulseDetectTimeout(uint8_t voice);
	uint8_t recordPulseSample(uint8_t voice, uint8_t sample);
	uint8_t handlePulseModulationDigi(uint8_t voice, uint8_t reg, uint8_t value);

	uint8_t handleIceGuysDigi(uint8_t voice, uint8_t reg, uint8_t value);

	uint8_t isMahoneyDigi();
	
	uint8_t setSwallowMode(uint8_t voice, uint8_t m);
	uint8_t handleSwallowDigi(uint8_t voice, uint8_t reg, uint16_t addr, uint8_t value);

	uint8_t getD418Sample( uint8_t value);

private:
	SID *_sid;
	uint16_t _base_addr;

	uint8_t _digi_enabled;	// for manual muting	
	int8_t _digi_source;	// lo-nibble: voice +1
	uint16_t _digi_count;
	
	// redundant environment state
	uint8_t _is_rsid;
	uint8_t _compatible;
	uint8_t _clock_rate;

	// diagnostic information for GUI use
	DigiType _used_digi_type;

	// last detected
	int32_t _current_digi_sample;
	uint8_t _current_digi_src;

	// FM: tracked timing state
	uint8_t _fm_count;
	FreqDetectState _freq_detect_state[3];
	uint32_t _freq_detect_ts[3];
	uint8_t _freq_detect_delayed_sample[3];
	
	// PWM: tracked timing state
	PulseDetectState _pulse_detect_state[3];
	uint32_t _pulse_detect_ts[3];
	uint8_t _pulse_detect_delayed_sample[3];
	uint8_t _pulse_detect_mode[3];	// 2= Pulse width LO/ 3= Pulse width HI
	
	// swallow's PWM
	uint16_t _swallow_pwm[3];
	
	// nmi d418 (hack)
	uint8_t _use_non_nmi_D418;
	uint8_t _non_nmi_count_D418;
	
};


#endif
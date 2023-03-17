/*
 tinyrsid_worklet_adapter.js: Adapts tinyrSID backend to workletAudioProcessor API

 version 1.0

 	Copyright (C) 2015 Juergen Wothke

version 2.0

    Copyright (C) 2015 Juergen Wothke

 LICENSE

 This library is free software; you can redistribute it and/or modify it
 under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 2.1 of the License, or (at
 your option) any later version. This library is distributed in the hope
 that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
 warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public
 License along with this library; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301 USA
*/


class AudioBackendAdapterBase {

    constructor(channels, bytesPerSample) {

        this.resampleBuffer = new Float32Array();
        this.channels = channels;
        this.bytesPerSample = bytesPerSample;
        this.sampleRate = 44100;
        this.inputSampleRate = 44100;
        this.observer;
        this.manualSetupComplete = true;  // override if necessary

    }


    // ************* core functions that must be defined by a subclass

    /**
    * Fills the audio buffer with the next batch of samples
    * Return 0: OK, -1: temp issue - waiting for file, 1: end, 2: error
    */
    computeAudioSamples() { this.error("computeAudioSamples"); }

    /**
    * Load the song's binary data into the backend as a first step towards playback.
    * The subclass can either use the 'data' directly or us the 'filename' to retrieve it indirectly
    * (e.g. when regular file I/O APIs are used).
    */
    loadMusicData(sampleRate, path, filename, data, options) { this.error("loadMusicData"); }

    /**
    * Second step towards playback: Select specific sub-song from the loaded song file.
    * Allows to select a specific sub-song and/or apply additional song setting..
    */
    evalTrackOptions(options) { this.error("evalTrackOptions"); }

    /**
    * Get info about currently selected music file and track. Respective info very much depends on
    * the specific backend - use getSongInfoMeta() to check for available attributes.
    */
    updateSongInfo(filename, result) { this.error("updateSongInfo"); }

    /**
    * Advertises the song attributes that can be provided by this backend.
    */
    getSongInfoMeta() { this.error("getSongInfoMeta"); }


    // ************* sample buffer and format related

    /**
    * Return: pointer to memory buffer that contains the sample data
    */
    getAudioBuffer() { this.error("getAudioBuffer"); }

    /**
    * Return: length of the audio buffer in 'ticks' (e.g. mono buffer with 1 8-bit
    *         sample= 1; stereo buffer with 1 32-bit * sample for each channel also= 1)
    */
    getAudioBufferLength() { this.error("getAudioBufferLength"); }

    /**
    * Reads one audio sample from the specified position.
    * Return sample value in range: -1..1
    */
    readFloatSample(buffer, idx) { this.error("readFloatSample"); }

    /**
    * @param pan 0..2 (1 creates mono)
    */
    applyPanning(buffer, len, pan) { this.error("applyPanning"); }

    /**
    * Return size one sample in bytes
    */
    getBytesPerSample() {
        return this.bytesPerSample;
    }

    /**
    * Number of channels, i.e. 1= mono, 2= stereo
    */
    getChannels() {
        return this.channels;
    }

    /*
    * Creates the URL used to retrieve the song file.
    */
    mapInternalFilename(overridePath, defaultPath, uri) {
        return ((overridePath) ? overridePath : defaultPath) + uri;  // this.basePath ever needed?
    }
    /*
    * Allows to map the filenames used in the emulation to external URLs.
    */
    mapUrl(filename) {
        return filename;
    }

    /*
    * Allows to perform some file input based manual setup sequence (e.g. setting some BIOS).
    * return 0: step successful & init completed, -1: error, 1: step successful
    */
    uploadFile(filename, options) {
        return 0;
    }

    /*
    * Check if this AudioBackendAdapterBase still needs manually performed
    * setup steps (see uploadFile())
    */
    isManualSetupComplete() {
        return this.manualSetupComplete;
    }

    /**
    * Cleanup backend before playing next music file
    */
    teardown() { this.error("teardown"); }

    // ************* optional: song "position seek" functionality (only available in backend)

    /**
    * Return: default 0 = seeking not supported
    */
    getMaxPlaybackPosition() { return 0; }

    /**
    * Return: default 0
    */
    getPlaybackPosition() { return 0; }

    /**
    * Move playback to 'pos': must be between 0 and getMaxPlaybackPosition()
    * Return: 0 if successful
    */
    seekPlaybackPosition(pos) { return -1; }

    // ************* optional: async file-loading related (only if needed)

    /**
    * Transform input filename into path/filename expected by the backend
    * Return array with 2 elements: 0: basePath (backend specific - most don't need one),
    *        1: filename (incl. the remainder of the path)
    */
    getPathAndFilename(filename) { this.error("getPathAndFilename"); }

    /**
    * Let backend store a loaded file in such a way that it can later deal with it.
    * Return a filehandle meaningful to the used backend
    */
    registerFileData(pathFilenameArray, data) { this.error("registerFileData"); }

    // if filename/path used by backend does not match the one used by the browser
    mapBackendFilename(name) { return name; }

    // introduced for backward-compatibility..
    mapCacheFileName(name) { return name; }
    /*
    * Backend may "push" update of song attributes (like author, copyright, etc)
    */
    handleBackendSongAttributes(backendAttr, target) { this.error("handleBackendSongAttributes"); }


    // ************* built-in utility functions
    mapUri2Fs(uri) {    // use extended ASCII that most likely isn't used in filenames
        // replace chars that cannot be used in file/foldernames
        let out = uri.replace(/\/\//, "Ã½Ã½");
        out = out.replace(/\?/, "Ã¿");
        out = out.replace(/:/, "Ã¾");
        out = out.replace(/\*/, "Ã¼");
        out = out.replace(/"/, "Ã»");
        out = out.replace(/</, "Ã¹");
        out = out.replace(/>/, "Ã¸");
        out = out.replace(/\|/, "Ã·");
        return out;
    }
    mapFs2Uri(fs) {
        let out = fs.replace(/Ã½Ã½/, "//");
        out = out.replace(/Ã¿/, "?");
        out = out.replace(/Ã¾/, ":");
        out = out.replace(/Ã¼/, "*");
        out = out.replace(/Ã»/, "\"");
        out = out.replace(/Ã¹/, "<");
        out = out.replace(/Ã¸/, ">");
        out = out.replace(/Ã·/, "|");
        return out;
    }


    error(name) {
        console.log("fatal error: abstract method '" + name + "' must be defined");
    }

    resetSampleRate(sampleRate, inputSampleRate) {
        if (sampleRate > 0) { this.sampleRate = sampleRate; }
        if (inputSampleRate > 0) { this.inputSampleRate = inputSampleRate; }

        const s = Math.round(SAMPLES_PER_BUFFER * this.sampleRate / this.inputSampleRate) * this.getChannels();

        if (s > this.resampleBuffer.length) {
            this.resampleBuffer = this.allocResampleBuffer(s);
        }
    }

    allocResampleBuffer(s) {
        return new Float32Array(s);
    }

    getCopiedAudio(input, len, funcReadFloat, resampleOutput) {
        // just copy the rescaled values so there is no need for special handling in playback loop
        for (let i = 0; i < len * this.channels; i++) {
            resampleOutput[i] = funcReadFloat(input, i * 2);
        }
        //console.log(resampleOutput)
        return len;
    }

    getResampledAudio(input, len) {
        return this.getResampledFloats(input, len, this.sampleRate, this.inputSampleRate);
    }

    getResampledFloats(input, len, sampleRate, inputSampleRate) {

        let resampleLen;
        if (sampleRate == inputSampleRate) {
            resampleLen = this.getCopiedAudio(input, len, this.readFloatSample.bind(this), this.resampleBuffer);
        } else {
            resampleLen = Math.round(len * sampleRate / inputSampleRate);
            const bufSize = resampleLen * this.channels;  // for each of the x channels

            if (bufSize > this.resampleBuffer.length) { this.resampleBuffer = this.allocResampleBuffer(bufSize); }

            // only mono and interleaved stereo data is currently implemented..
            this.resampleToFloat(this.channels, 0, input, len, this.readFloatSample.bind(this), this.resampleBuffer, resampleLen);
            if (this.channels == 2) {
                this.resampleToFloat(this.channels, 1, input, len, this.readFloatSample.bind(this), this.resampleBuffer, resampleLen);
            }
        }
        return resampleLen;
    }

    // utility
    resampleToFloat(channels, channelId, inputPtr, len, funcReadFloat, resampleOutput, resampleLen) {
        // Bresenham (line drawing) algorithm based resampling
        const x0 = 0;
        const y0 = 0;
        const x1 = resampleLen - 0;
        const y1 = len - 0;

        const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        const err = dx + dy;
        let e2;

        let i;
        for (; ;) {
            i = (x0 * channels) + channelId;
            resampleOutput[i] = funcReadFloat(inputPtr, (y0 * channels) + channelId);

            if (x0 >= x1 && y0 >= y1) { break; }
            e2 = 2 * err;
            if (e2 > dy) { err += dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    getResampleBuffer() {
        return this.resampleBuffer;
    }

}


/*
* Emscripten based backends that produce 16-bit sample data.
*
*/
class EmsHEAP16BackendAdapter extends AudioBackendAdapterBase {

    constructor(backend, channels) {
        super(channels, 2)
        this.Module = backend;
    }

    readFloatSample(buffer, idx) {
        return (this.Module.HEAP16[buffer + idx]) / 0x8000;
    }

    // certain songs use an unfavorable L/R separation - e.g. bass on one channel - that is
    // not nice to listen to. This "panning" impl allows to "mono"-ify those songs.. (this.pan=1
    // creates mono)
    applyPanning(buffer, len, pan) {
        pan = pan * 256.0 / 2.0;

        for (let i = 0; i < len * 2; i += 2) {
            const l = this.Module.HEAP16[buffer + i];
            const r = this.Module.HEAP16[buffer + i + 1];
            let m = (r - l) * pan;

            const nl = ((l << 8) + m) >> 8;
            const nr = ((r << 8) - m) >> 8;
            this.Module.HEAP16[buffer + i] = nl;
            this.Module.HEAP16[buffer + i + 1] = nr;
        }
    }

}





/*
 tinyrsid_adapter.js: Adapts Tiny'R'Sid backend to generic WebAudio/ScriptProcessor player.

 version 1.02

     Copyright (C) 2020 Juergen Wothke

    Adapted to ES6 / audioworklet (c) 2023 Bertrand Tornil

 LICENSE

 This software is licensed under a CC BY-NC-SA
 (http://creativecommons.org/licenses/by-nc-sa/4.0/).
*/

const backend_module = backend_tinyrsid();

class SIDBackendAdapter extends EmsHEAP16BackendAdapter {
    constructor(basicROM, charROM, kernalROM, nextFrameCB) {
        super(backend_module, 2);

        this.playerSampleRate;

        this.maxSids = 10;    // redundant to C side code

        this.cutoffSize = 1024;

        this._scopeEnabled= false;

        this._chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        this._ROM_SIZE= 0x2000;
        this._CHAR_ROM_SIZE= 0x1000;

        this._nextFrameCB= (typeof nextFrameCB == 'undefined') ? this.nopCB : nextFrameCB;

        this._basicROM= this.base64DecodeROM(basicROM, this._ROM_SIZE);
        this._charROM= this.base64DecodeROM(charROM, this._CHAR_ROM_SIZE);
        this._kernalROM= this.base64DecodeROM(kernalROM, this._ROM_SIZE);

        this._digiShownLabel= "";
        this._digiShownRate= 0;

        this.resetDigiMeta();
    }

    /**
    * @param panArray 30-entry array with float-values ranging from 0.0 (100% left channel) to 1.0 (100% right channel) .. one value for each voice of the max 10 SIDs
    */
    initPanningCfg(panArray) {
        if (panArray.length != this.maxSids*3) {
            console.log("error: initPanningCfg requires an array with panning-values for each of 10 SIDs that WebSid potentially supports.");
        } else {
            // note: this might be called before the WASM is ready
            this.panArray = panArray;

            if (!backend_SID.Module.notReady) {
                this.Module.ccall('initPanningCfg', 'number', ['number','number','number','number','number','number','number','number','number','number',
                                                                'number','number','number','number','number','number','number','number','number','number',
                                                                'number','number','number','number','number','number','number','number','number','number'],
                                                        [panArray[0],panArray[1],panArray[2],panArray[3],panArray[4],panArray[5],panArray[6],panArray[7],panArray[8],panArray[9],
                                                        panArray[10],panArray[11],panArray[12],panArray[13],panArray[14],panArray[15],panArray[16],panArray[17],panArray[18],panArray[19],
                                                        panArray[20],panArray[21],panArray[22],panArray[23],panArray[24],panArray[25],panArray[26],panArray[27],panArray[28],panArray[29],]);
            }
        }
    }

    getPanning(sidIdx, voiceIdx) {
        return this.Module.ccall('getPanning', 'number', ['number', 'number'], [sidIdx, voiceIdx]);
    }

    setPanning(sidIdx, voiceIdx, panning) {
        this.Module.ccall('setPanning', 'number',  ['number','number','number'], [sidIdx, voiceIdx, panning]);
    }

    nopCB() {
    }

    resetDigiMeta() {
        this._digiTypes= {};
        this._digiRate= 0;
        this._digiBatches= 0;
        this._digiEmuCalls= 0;
    }

    enableScope(enable) {
        this._scopeEnabled= enable;
    }

    getAudioBuffer() {
        var ptr=  this.Module.ccall('getSoundBuffer', 'number');
        return ptr>>1;    // 16 bit samples
    }

    getAudioBufferLength() {
        var len= this.Module.ccall('getSoundBufferLen', 'number');
        return len;
    }

    printMemDump(name, startAddr, endAddr) {    // util for debugging
        var text= "const unsigned char "+name+"[] =\n{\n";
        var line= "";
        var j= 0;
        for (var i= 0; i<(endAddr-startAddr+1); i++) {
            var d= this.Module.ccall('getRAM', 'number', ['number'], [startAddr+i]);
            line += "0x"+(("00" + d.toString(16)).substr(-2).toUpperCase())+", ";
            if (j  == 11) {
                text+= (line + "\n");
                line= "";
                j= 0;
            }else {
                j++;
            }
        }
        text+= (j?(line+"\n"):"")+"}\n";
        console.log(text);
    }

    updateDigiMeta() {
        // get a "not so jumpy" status describing digi output

        var dTypeStr= this.getExtAsciiString(this.Module.ccall('getDigiTypeDesc', 'number'));
        var dRate= this.Module.ccall('getDigiRate', 'number');
        // "computeAudioSamples" correspond to 50/60Hz, i.e. to show some
        // status for at least half a second, labels should only be updated every
        // 25/30 calls..

        if (!isNaN(dRate) && dRate) {
            this._digiBatches++;
            this._digiRate+= dRate;
            this._digiTypes[dTypeStr]= 1;    // collect labels
        }

        this._digiEmuCalls++;
        if (this._digiEmuCalls == 20) {
            this._digiShownLabel= "";

            if (!this._digiBatches) {
                this._digiShownRate= 0;
            } else {
                this._digiShownRate= Math.round(this._digiRate/this._digiBatches);

                const arr = Object.keys(this._digiTypes).sort();
                var c = 0;
                for (const key of arr) {
                    if (key.length && (key != "NONE"))
                        c++;
                }
                for (const key of arr) {
                    if (key.length && (key != "NONE")  && ((c == 1) || (key != "D418")))    // ignore combinations with D418
                        this._digiShownLabel+= (this._digiShownLabel.length ? "&"+key : key);
                }
            }
            this.resetDigiMeta();
        }
    }

    computeAudioSamples() {
        if (typeof window.sid_measure_runs == 'undefined' || !window.sid_measure_runs) {
            window.sid_measure_sum= 0;
            window.sid_measure_runs= 0;
        }
        this._nextFrameCB(this);    // used for "interactive mode"

        var t = performance.now();
//            console.profile(); // if compiled using "emcc.bat --profiling"

        var len= this.Module.ccall('computeAudioSamples', 'number');
        if (len <= 0) {
            this.resetDigiMeta();
            return 1; // >0 means "end song"
        }
//            console.profileEnd();
        window.sid_measure_sum+= performance.now() - t;
        if (window.sid_measure_runs++ == 100) {
            window.sid_measure = window.sid_measure_sum/window.sid_measure_runs;

//                console.log("time; " + window.sid_measure_sum/window.sid_measure_runs);
            window.sid_measure_sum = window.sid_measure_runs = 0;


            if (typeof window.sid_measure_avg_runs == 'undefined' || !window.sid_measure_avg_runs) {
                window.sid_measure_avg_sum= window.sid_measure;
                window.sid_measure_avg_runs= 1;
            } else {
                window.sid_measure_avg_sum+= window.sid_measure;
                window.sid_measure_avg_runs+= 1;
            }
            window.sid_measure_avg= window.sid_measure_avg_sum/window.sid_measure_avg_runs;
        }
        this.updateDigiMeta();
        return 0;
    }

    getPathAndFilename(filename) {
        return ['/', filename];
    }

    registerFileData(pathFilenameArray, data) {
        return 0;    // FS not used in Tiny'R'Sid
    }

    loadMusicData(sampleRate, path, filename, data, options) {
        var buf = this.Module._malloc(data.length);
        this.Module.HEAPU8.set(data, buf);

        var basicBuf= 0;
        if (this._basicROM) { basicBuf = this.Module._malloc(this._ROM_SIZE); this.Module.HEAPU8.set(this._basicROM, basicBuf);}

        var charBuf= 0;
        if (this._charROM) { charBuf = this.Module._malloc(this._CHAR_ROM_SIZE); this.Module.HEAPU8.set(this._charROM, charBuf);}

        var kernalBuf= 0;
        if (this._kernalROM) { kernalBuf = this.Module._malloc(this._ROM_SIZE); this.Module.HEAPU8.set(this._kernalROM, kernalBuf);}

        // try to use native sample rate to avoid resampling
        this.playerSampleRate= (typeof window._gPlayerAudioCtx == 'undefined') ? 0 : window._gPlayerAudioCtx.sampleRate;

        var isMus= filename.endsWith(".mus") || filename.endsWith(".str");    // Compute! Sidplayer file (stereo files not supported)
        var ret = this.Module.ccall('loadSidFile', 'number', ['number', 'number', 'number', 'number', 'string', 'number', 'number', 'number'],
                                    [isMus, buf, data.length, this.playerSampleRate, filename, basicBuf, charBuf, kernalBuf]);

        if (kernalBuf) this.Module._free(kernalBuf);
        if (charBuf) this.Module._free(charBuf);
        if (basicBuf) this.Module._free(basicBuf);

        this.Module._free(buf);

        if (ret == 0) {
            this.playerSampleRate = this.Module.ccall('getSampleRate', 'number');
            this.resetSampleRate(sampleRate, this.playerSampleRate);
        }
        return ret;
    }

    evalTrackOptions(options) {
        if (typeof options.timeout != 'undefined') {
            ScriptNodePlayer.getInstance().setPlaybackTimeout(options.timeout*1000);
        }
        var traceSID= this._scopeEnabled;
        if (typeof options.traceSID != 'undefined') {
            traceSID= options.traceSID;
        }
        if (typeof options.track == 'undefined') {
            options.track= -1;
        }
        this.resetDigiMeta();

        var procBufSize= ScriptNodePlayer.getInstance().getScriptProcessorBufSize();
        return this.Module.ccall('playTune', 'number', ['number', 'number', 'number'], [options.track, traceSID, procBufSize]);
    }

    setFilterConfig6581(base, max, steepness, x_offset, distort, distortOffset, distortScale, distortThreshold, kink) {
        return this.Module.ccall('setFilterConfig6581', 'number',
                                    ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
                                    [base, max, steepness, x_offset, distort, distortOffset, distortScale, distortThreshold, kink]);
    }

    getFilterConfig6581() {
        var heapPtr = this.Module.ccall('getFilterConfig6581', 'number') >> 3;    // 64-bit

        var result= {
            "base": this.Module.HEAPF64[heapPtr+0],
            "max": this.Module.HEAPF64[heapPtr+1],
            "steepness": this.Module.HEAPF64[heapPtr+2],
            "x_offset": this.Module.HEAPF64[heapPtr+3],
            "distort": this.Module.HEAPF64[heapPtr+4],
            "distortOffset": this.Module.HEAPF64[heapPtr+5],
            "distortScale": this.Module.HEAPF64[heapPtr+6],
            "distortThreshold": this.Module.HEAPF64[heapPtr+7],
            "kink": this.Module.HEAPF64[heapPtr+8],
        };
        return result;
    }

    getCutoffsLength() {
        return this.cutoffSize;
    }

    fetchCutoffs6581(distortLevel, destinationArray) {
        var heapPtr = this.Module.ccall('getCutoff6581', 'number', ['number'], [distortLevel]) >> 3;    // 64-bit

        for (var i= 0; i<this.cutoffSize; i++) {
            destinationArray[i]= this.Module.HEAPF64[heapPtr+i];
        }
    }

    teardown() {
        // nothing to do
    }

    getSongInfoMeta() {
        return {
                loadAddr: Number,
                playSpeed: Number,
                maxSubsong: Number,
                actualSubsong: Number,
                songName: String,
                songAuthor: String,
                songReleased: String
                };
    }

    getExtAsciiString(heapPtr) {
        // Pointer_stringify cannot be used here since UTF-8 parsing
        // messes up original extASCII content
        var text="";
        for (var j= 0; j<32; j++) {
            var b= this.Module.HEAP8[heapPtr+j] & 0xff;
            if(b ==0) break;

            if(b < 128){
                text = text + String.fromCharCode(b);
            } else {
                text = text + "&#" + b + ";";
            }
        }
        return text;
    }

    updateSongInfo(filename, result) {
    // get song infos (so far only use some top level module infos)
        var numAttr= 7;
        var ret = this.Module.ccall('getMusicInfo', 'number');

        var array = this.Module.HEAP32.subarray(ret>>2, (ret>>2)+7);
        result.loadAddr= this.Module.HEAP32[((array[0])>>2)]; // i32
        result.playSpeed= this.Module.HEAP32[((array[1])>>2)]; // i32
        result.maxSubsong= this.Module.HEAP8[(array[2])]; // i8
        result.actualSubsong= this.Module.HEAP8[(array[3])]; // i8
        result.songName= this.getExtAsciiString(array[4]);
        result.songAuthor= this.getExtAsciiString(array[5]);
        result.songReleased= this.getExtAsciiString(array[6]);
    },

    // C64 emu specific accessors (that might be useful in GUI)
    isSID6581() {
        return this.Module.ccall('envIsSID6581', 'number');
    }

    setSID6581(is6581) {
        this.Module.ccall('envSetSID6581', 'number', ['number'], [is6581]);
    }

    isNTSC() {
        return this.Module.ccall('envIsNTSC', 'number');
    }

    setNTSC(ntsc) {
        this.Module.ccall('envSetNTSC', 'number', ['number'], [ntsc]);
    },

    // access used SID chips meta information
    countSIDs() {
        return this.Module.ccall('countSIDs', 'number');
    }

    getSIDBaseAddr(sidIdx) {
        return this.Module.ccall('getSIDBaseAddr', 'number', ['number'], [sidIdx]);
    },

    /**
    * Gets a SID's register with about ~1 frame precison - using the actual position played
    * by the WebAudio infrastructure.
    *
    * prerequisite: ScriptNodePlayer must be configured with an "external ticker" for precisely timed access.
    */
    getSIDRegister(sidIdx, reg) {

        var p= ScriptNodePlayer.getInstance();
        var bufIdx= p.getTickToggle();
        var tick= p.getCurrentTick(); // playback position in currently played WebAudio buffer (in 256-samples steps)

        return this.Module.ccall('getSIDRegister2', 'number', ['number', 'number', 'number', 'number'], [sidIdx, reg, bufIdx, tick]);
    }

    /**
    * Gets a specific SID voice's output level (aka envelope) with about ~1 frame precison - using the actual position played
    * by the WebAudio infrastructure.
    *
    * prerequisite: ScriptNodePlayer must be configured with an "external ticker" for precisely timed access.
    */
    readVoiceLevel(sidIdx, voiceIdx) {

        var p= ScriptNodePlayer.getInstance();
        var bufIdx= p.getTickToggle();
        var tick= p.getCurrentTick(); // playback position in currently played WebAudio buffer (in 256-samples steps)

        return this.Module.ccall('readVoiceLevel', 'number', ['number', 'number', 'number', 'number'], [sidIdx, voiceIdx, bufIdx, tick]);
    }

    setSIDRegister(sidIdx, reg, value) {
        return this.Module.ccall('setSIDRegister', 'number', ['number', 'number', 'number'], [sidIdx, reg, value]);
    },

    // To activate the below output a song must be started with the "traceSID" option set to 1:
    // At any given moment the below getters will then correspond to the output of getAudioBuffer
    // and what has last been generated by computeAudioSamples. They expose some of the respective
    // underlying internal SID state (the "filter" is NOT reflected in this data).
    getNumberTraceStreams() {
        return this.Module.ccall('getNumberTraceStreams', 'number');
    }

    getTraceStreams() {
        var result= [];
        var n= this.getNumberTraceStreams();

        var ret = this.Module.ccall('getTraceStreams', 'number');
        var array = this.Module.HEAP32.subarray(ret>>2, (ret>>2)+n);

        for (var i= 0; i<n; i++) {
            result.push(array[i] >> 1);    // pointer to int16 array
        }
        return result;
    },

    readFloatTrace(buffer, idx) {
        return (this.Module.HEAP16[buffer+idx])/0x8000;
    }

    getCopiedScopeStream(input, len, output) {
        for(var i= 0; i<len; i++){
            output[i]=  this.Module.HEAP16[input+i]; // will be scaled later anyway.. avoid the extra division here /0x8000;
        }
        return len;
    },

    getRAM(offset) {
        return this.Module.ccall('getRAM', 'number', ['number'], [offset]);
    }

    setRAM(offset, value) {
        this.Module.ccall('setRAM', 'number', ['number', 'number'], [offset, value]);
    }

    /**
    * Diagnostics digi-samples (if any).
    */
    getDigiType() {
        return this.Module.ccall('getDigiType', 'number');
    }

    getDigiTypeDesc() {
        return this._digiShownLabel;
    }

    getDigiRate() {
        return this._digiShownRate;
    }

    enableVoice(sidIdx, voice, on) {
        this.Module.ccall('enableVoice', 'number', ['number', 'number', 'number'], [sidIdx, voice, on]);
    },

    getStereoLevel() {
        return this.Module.ccall('getStereoLevel', 'number');
    }

    getReverbLevel() {
        return this.Module.ccall('getReverbLevel', 'number');
    }

    getHeadphoneMode() {
        return this.Module.ccall('getHeadphoneMode', 'number');
    },

    /**
    * @param effect_level -1=stereo completely disabled (no panning), 0=no stereo enhance disabled (only panning); >0= stereo enhance enabled: 16384=low 24576=medium 32767=high
    */
    setStereoLevel(effect_level) {
        return this.Module.ccall('setStereoLevel', 'number', ['number'], [effect_level]);
    },

    /**
    * @param level 0..100
    */
    setReverbLevel(level) {
        return this.Module.ccall('setReverbLevel', 'number', ['number'], [level]);
    }

    /**
    * @param mode 0=headphone 1=ext-headphone
    */
    setHeadphoneMode(mode) {
        return this.Module.ccall('setHeadphoneMode', 'number', ['number'], [mode]);
    },


    /**
    * @deprecated use getSIDRegister instead
    */
    getRegisterSID(offset) {
        return this.Module.ccall('getRegisterSID', 'number', ['number'], [offset]);
    }

    /**
    * @deprecated use setSIDRegister instead
    */
    setRegisterSID(offset, value) {
        this.Module.ccall('setRegisterSID', 'number', ['number', 'number'], [offset, value]);
    }

    /*
    * @deprecated APIs below - use getTraceStreams/getNumberTraceStreams instead
    */
    // disable voices (0-3) by clearing respective bit
    enableVoices(mask) {
        this.Module.ccall('enableVoices', 'number', ['number'], [mask]);
    }

    getBufferVoice1() {
        var ptr=  this.Module.ccall('getBufferVoice1', 'number');
        return ptr>>1;    // 16 bit samples
    }

    getBufferVoice2() {
        var ptr=  this.Module.ccall('getBufferVoice2', 'number');
        return ptr>>1;    // 16 bit samples
    }

    getBufferVoice3() {
        var ptr=  this.Module.ccall('getBufferVoice3', 'number');
        return ptr>>1;    // 16 bit samples
    }

    getBufferVoice4() {
        var ptr=  this.Module.ccall('getBufferVoice4', 'number');
        return ptr>>1;    // 16 bit samples
    }

    // base64 decoding util
    findChar(str, c) {
        for (var i= 0; i<str.length; i++) {
            if (str.charAt(i) == c) {
                return i;
            }
        }
        return -1;
    }

    alphanumeric(inputtxt) {
        var letterNumber = /^[0-9a-zA-Z]+$/;
        return inputtxt.match(letterNumber);
    }

    is_base64(c) {
      return (this.alphanumeric(""+c) || (c == '+') || (c == '/'));
    }

    base64DecodeROM(encoded, romSize) {
        if (typeof encoded == 'undefined') return 0;

        var in_len= encoded.length;
        var i= j= in_= 0;
        var arr4= new Array(4);
        var arr3= new Array(3);

        var ret= new Uint8Array(romSize);
        var ri= 0;

        while (in_len-- && ( encoded.charAt(in_) != '=') && this.is_base64(encoded.charAt(in_))) {
            arr4[i++]= encoded.charAt(in_); in_++;
            if (i ==4) {
                for (i = 0; i <4; i++) {
                    arr4[i] = this.findChar(this._chars, arr4[i]);
                }
                arr3[0] = ( arr4[0] << 2       ) + ((arr4[1] & 0x30) >> 4);
                arr3[1] = ((arr4[1] & 0xf) << 4) + ((arr4[2] & 0x3c) >> 2);
                arr3[2] = ((arr4[2] & 0x3) << 6) +   arr4[3];

                for (i = 0; (i < 3); i++) {
                    var val= arr3[i];
                    ret[ri++]= val;
                }
                i = 0;
            }
        }
        if (i) {
            for (j = 0; j < i; j++) {
                arr4[j] = this.findChar(this._chars, arr4[j]);
            }
            arr3[0] = (arr4[0] << 2) + ((arr4[1] & 0x30) >> 4);
            arr3[1] = ((arr4[1] & 0xf) << 4) + ((arr4[2] & 0x3c) >> 2);

            for (j = 0; (j < i - 1); j++) {
                var val= arr3[j];
                ret[ri++]= val;
            }
        }
        if (ri == romSize) {
            return ret;
        }
        return 0;
    }
}


const BASIC_ROM = "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";
const KERNAL_ROM = "hVYgD7ylYcmIkAMg1LogzLylBxhpgfDzOOkBSKIFtWm0YZVhlGnKEPWlVoVwIFO4ILS/qcSgvyBZ4KkAhW9oILm6YIVxhHIgyrupVyAouiBd4KlXoABMKLqFcYRyIMe7sXGFZ6RxyJjQAuZyhXGkciAouqVxpHIYaQWQAciFcYRyIGe4qVygAMZn0ORgmDVEegBoKLFGACArvDA30CAg8/+GIoQjoASxIoViyLEihWSgCLEihWPIsSKFZUzj4KmLoAAgorupjaDgICi6qZKg4CBnuKZlpWKFZYZipmOlZIVjhmSpAIVmpWGFcKmAhWEg17iii6AATNS7yfDQB4Q4hjdMY6aq0AKiHkw3pCDS/7DoYCDP/7DiYCCt5LDcYCDG/7DWYCDk/7DQYCCKrSD3t6nhSKlGSK0PA0itDAOuDQOsDgMobBQACI0MA44NA4wOA2iNDwNgINThpi2kLqkrINj/sJVgqQEsqQCFCiDU4aUKpiukLCDV/7BXpQrwF6IcILf/KRDQF6V6yQLwB6lkoKNMHqtgILf/Kb/wBaIdTDekpXvJAtAOhi2ELql2oKMgHqtMKqUgjqYgM6VMd6YgGeIgwP+wC2AgGeKlSSDD/5DDTPngqQAgvf+iAaAAILr/IAbiIFfiIAbiIADioACGSSC6/yAG4iAA4oqopklMuv8gDuJMnrcgeQDQAmhoYCD9riB5AND3TAivqQAgvf8gEeIgnreGSYqiAaAAILr/IAbiIADihkqgAKVJ4AOQAYgguv8gBuIgAOKKqKZKpUkguv8gBuIgDuIgnq0go7amIqQjTL3/qeCg4iBnuCAMvKnloOKmbiAHuyAMvCDMvKkAhW8gU7ip6qDiIFC4pWZIEA0gSbilZjAJpRJJ/4USILS/qeqg4iBnuGgQAyC0v6nvoOJMQ+AgyrupAIUSIGviok6gACD24KlXoAAgorupAIVmpRIg3OKpTqAATA+7SEyd4oFJD9qig0kP2qJ/AAAAAAWE5hotG4YoB/v4h5loiQGHIzXf4YalXecog0kP2qKlZkgQAyC0v6VhSMmBkAepvKC5IA+7qT6g4yBD4GjJgZAHqeCg4iBQuGgQA0y0v2ALdrODvdN5HvSm9XuD/LAQfAwfZ8p83lPLwX0UZHBMfbfqUXp9YzCIfn6SRJk6fkzMkcd/qqqqE4EAAAAAIMz/qQCFEyB6pliigGwAA4owA0w6pEx0pCBT5CC/4yAi5KL7mtDk5nrQAuZ7rWDqyTqwCskg8O846TA46dBggE/HUlipTIVUjRADqUigso0RA4wSA6mRoLOFBYQGqaqgsYUDhASiHL2i45VzyhD4qQOFU6kAhWiFE4UYogGO/QGO/AGiGYYWOCCc/4YrhCw4IJn/hjeEOIYzhDSgAJiRK+Yr0ALmLGClK6QsIAikqXOg5CAeq6U3OOUrqqU45Swgzb2pYKDkIB6rTESmi+ODpHylGqfkp4auogu9R+SdAAPKEPdgACBCQVNJQyBCWVRFUyBGUkVFDQCTDSAgICAqKioqIENPTU1PRE9SRSA2NCBCQVNJQyBWMiAqKioqDQ0gNjRLIFJBTSBTWVNURU0gIACBSCDJ/6pokAGKYKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqFqakBhatgrYYCkfNgaQKkkcjQBMWh0PdgGSZEGRoR6A1wDAYG0QI3Aa4AaQCiAKDcYKIooBlgsAeG1oTTIGzlptak02AgoOWpAI2RAoXPqUiNjwKp642QAqkKjYkCjYwCqQ6NhgKpBI2LAqkMhc2FzK2IAgmAqKkAqpTZGGkokAHI6OAa0POp/5XZohgg/+nKEPqgAITThNam1qXTtNkwCBhpKIXTyhD0IPDpqSfotNkwBhhpKOgQ9oXVTCTq5MnwA0zt5mDqIKDlTGblqQOFmqkAhZmiL7247J3/z8rQ92CsdwKiAL14Ap13AujkxtD1xsaYWBhgIBbnpcaFzI2SAvD3eKXP8Aylzq6HAqAAhM8gE+ogtOXJg9AQogl4hsa95uyddgLK0Pfwz8kN0Mik1YTQsdHJINADiND3yITIoACMkgKE04TUpckwG6bWIJHl5MnQEqXKhdPFyJAKsCuYSIpIpdDwk6TTsdGF1yk/Btck1xACCYCQBKbU0ARwAglA5tMghObEyNAXqQCF0KkNppngA/AGpprgA/ADIBbnqQ2F12iqaKil18ne0AKp/xhgySLQCKXUSQGF1KkiYAlApsfwAgmAptjwAsbYroYCIBPqILbmaKil2PACRtRoqmgYWGAgs+jm06XVxdOwP8lP8DKtkgLwA0xn6abW4BmQByDq6MbWptYW2VbZ6LXZCYCV2cql1RhpKIXVtdkwA8rQ+Uzw6cbWIHzoqQCF02Cm1tAGhtNoaNCdyobWIGzlpNWE02BIhdeKSJhIqQCF0KTTpdcQA0zU58kN0ANMkejJIJAQyWCQBCnf0AIpPyCE5kyT5qbY8ANMl+bJFNAumNAGIAHnTHPnIKHoiITTICTqyLHRiJHRyLHziJHzyMTV0O+pIJHRrYYCkfMQTabU8ANMl+bJEtAChcfJE9ADIGblyR3QF8ggs+iE04jE1ZAJxtYgfOigAITTTKjmyRHQHRiYaSio5tbF1ZDs8OrG1ukokASF09D4IHzoTKjmIMvoTETsKX/Jf9ACqV7JIJADTJHmyQ3QA0yR6KbU0D/JFNA3pNWx0ckg0ATE09AHwE/wJCBl6aTVICTqiLHRyJHRiLHzyJHziMTT0O+pIJHRrYYCkfPm2Eyo5qbY8AUJQEyX5skR0Bam1vA3xtal0zjpKJAEhdMQKiBs5dAlyRLQBKkAhcfJHdASmPAJIKHoiITTTKjmIAHnTKjmyRPQBiBE5Uyo5gmAIMvoTE/sRsmm1ujgGdADIOrotdkQ9IbWTGzlogCG2IbHhtSG0yB86Eyo5qICqQDF0/AHGGkoytD2YMbWYKICqSfF0/AHGGkoytD2YKbW4BnwAubWYKIP3dro8ATKEPhgjoYCYJAFHJ+cHh+egZWWl5iZmpulrEilrUilrkilr0ii/8bWxsnOpQLoIPDp4BiwDL3x7IWstdogyOkw7CD/6aIAtdkpf7TaEAIJgJXZ6OAY0O+l8QmAhfGl2RDD5tbupQKpf40A3K0B3Mn7CKl/jQDcKNALoADqytD8iND5hMam1miFr2iFrmiFrWiFrGCm1ui12RD7jqUC4BjwDpAMIOrorqUCysbWTNrmpaxIpa1Ipa5Ipa9IohnKIPDp7KUCkA7wDL3v7IWstdggyOkw6SD/6aIX7KUCkA+12il/tNkQAgmAldrK0OyupQIg2uZMWOkpAw2IAoWtIODpoCexrJHRsa6R84gQ9WAgJOqlrIWupa0pAwnYha9gvfDshdG12SkDDYgChdJgoCcg8OkgJOog2uSpIJHRiBD2YOqoqQKFzSAk6pik05HRipHzYKXRhfOl0ikDCdiF9GAg6v+lzNApxs3QJakUhc2k00bProcCsdGwEebPhc4gJOqx842HAq6GAqXOSYAgHOqlASkQ8AqgAITApQEJINAIpcDQBqUBKR+FASCH6q0N3GioaKpoQKkAjY0CoECEy40A3K4B3OD/8GGoqYGF9anrhfap/o0A3KIISK0B3M0B3ND4SrAWSLH1yQWwDMkD8AgNjQKNjQIQAoTLaMjAQbALytDfOGgqjQDc0MxobI8CpMux9arExfAHoBCMjALQNil/LIoCMBZwScl/8CnJFPAMySDwCMkd8ATJEdA1rIwC8AXOjALQK86LAtAmoASMiwKkxogQHKTLhMWsjQKMjgLg//AOiqbG7IkCsAaddwLohsapf40A3GCtjQLJA9AVzY4C8O6tkQIwHa0Y0EkCjRjQTHbrCskIkAKpBqq9eeuF9b1664X2TODqgevC6wPseOwUDR2IhYaHETNXQTRaU0UBNVJENkNGVFg3WUc4QkhVVjlJSjBNS09OK1BMLS46QCxcKjsTAT1eLzFfBDIgAlED/5SNnYyJiouRI9fBJNrTxQEl0sQmw8bU2CfZxyjCyNXWKcnKMM3Lz87b0MzdPlu6PKnAXZMBPd4/IV8EIqAC0YP/lI2djImKi5GWs7CXra6xAZiyrJm8u6O9mrelm7+0uL4porUwp6G5qqavttw+W6Q8qN9dkwE93j+BXwSVoAKrg//JDtAHrRjQCQLQCcmO0AutGNAp/Y0Y0Eyo5skI0AepgA2RAjAJyQnQ7ql/LZECjZECTKjm//////////8cFwGfGhMF/5wSBB4DBhQYHxkHngIIFRYSCQqSDQsPDv8QDP//GwD/HP8d//8fHv+QBv8F//8R//8AAAAAAAAAAAAAAAAAAAAAAJs3AAAACAAUDwAAAAAAAA4GAQIDBAABAgMEBQYHTE9BRA1SVU4NAChQeKDI8BhAaJC44AgwWICo0PggSHCYwAlALAkgIKTwSCSUEAo4ZqMgQO1GlEajaIWVeCCX7sk/0AMghe6tAN0JCI0A3Xggju4gl+4gs+54IJfuIKnusGQghe4koxAKIKnukPsgqe6w+yCp7pD7II7uqQiFpa0A3c0A3dD4CpA/ZpWwBSCg7tADIJfuIIXu6urq6q0A3SnfCRCNAN3GpdDUqQSNB9ypGY0P3K0N3K0N3CkC0Aogqe6w9FhgqYAsqQMgHP5YGJBKhZUgNu2tAN0p940A3WCFlSA27XggoO4gvu0ghe4gqe4w+1hgJJQwBThmlNAFSCBA7WiFlRhgeCCO7q0A3QkIjQDdqV8sqT8gEe0gvu2KogrK0P2qIIXuTJfueKkAhaUghe4gqe4Q+6kBjQfcqRmND9wgl+6tDdytDdwpAtAHIKnuMPQQGKWl8AWpAkyy7SCg7iCF7qlAIBz+5qXQyqkIhaWtAN3NAN3Q+AoQ9WakrQDdzQDd0PgKMPXGpdDkIKDuJJBQAyAG7qWkWBhgrQDdKe+NAN1grQDdCRCNAN1grQDdKd+NAN1grQDdCSCNAN1grQDdzQDd0PgKYIqiuMrQ/apgpbTwRzA/RraiAJAByopFvYW9xrTwBoopBIW1YKkgLJQC8BQwHHAUpb3QAcrGtK2TAhDjxrTQ3+a00PClvfDt0Opw6VDm5rSi/9DLrZQCSpAHLAHdEB1QHqkAhb2Fta6YAoa0rJ0CzJ4C8BOx+YW27p0CYKlALKkQDZcCjZcCqQGNDd1NoQIJgI2hAo0N3WCiCakgLJMC8AHKUALKymCmqdAzxqjwNjANpadFq4WrRqdmqmDGqKWn8GetkwIKqQFlqNDvqZCNDd0NoQKNoQKFqakCTDvvpafQ6kzT5KybAsjMnALwKoybAoilqq6YAuAJ8ARK6ND4kfepICyUAvC0MLGlp0Wr8ANwqSxQpqkBLKkELKmALKkCDZcCjZcCTH7vparQ8fDshZqtlAJKkCmpAiwB3RAd0CCtoQIpAtD5LAHdcPutAd0JAo0B3SwB3XAHMPmpQI2XAhhgICjwrJ4CyMydAvD0jJ4CiKWekfmtoQJKsB6pEI0O3a2ZAo0E3a2aAo0F3amBIDvvIAbvqRGNDt1ghZmtlAJKkCgpCPAkqQIsAd0QrfAiraECSrD6rQHdKf2NAd2tAd0pBPD5qZAYTDvvraECKRLw8xhgrZcCrJwCzJsC8Asp942XArH37pwCYAkIjZcCqQBgSK2hAvARraECKQPQ+akQjQ3dqQCNoQJoYA1JL08gRVJST1Igow1TRUFSQ0hJTkegRk9SoA1QUkVTUyBQTEFZIE9OIFRBUMVQUkVTUyBSRUNPUkQgJiBQTEFZIE9OIFRBUMUNTE9BRElOxw1TQVZJTkegDVZFUklGWUlOxw1GT1VORKANT0uNJJ0QDbm98AgpfyDS/8goEPMYYKWZ0AilxvAPeEy05ckC0BiElyCG8KSXGGClmdALpdOFyqXWhclMMubJA9AJhdCl1YXITDLmsDjJAvA/hpcgmfGwFkggmfGwDdAFqUAgHP7GpqaXaGCqaIqml2AgDfjQCyBB+LARqQCFpvDwsbIYYKWQ8ASpDRhgTBPuIE7xsPfJANDyrZcCKWDQ6fDuSKWayQPQBGhMFueQBGhM3e1KaIWeikiYSJAjIA340A4gZPiwDqkCoACRssiEpqWekbIYaKhoqqWekAKpAGAgF/BM/PEgD/PwA0wB9yAf86W68BbJA/ASsBTJAtADTE3wprngYPADTAr3hZkYYKogCe2luRAGIMztTEjyIMftiiSQEOZMB/cgD/PwA0wB9yAf86W60ANMDffJA/APsBHJAtADTOHvprngYPDqhZoYYKogDO2luRAFIL7t0AMgue2KJJAQ50wH9yAU8/ACGGAgH/OKSKW68FDJA/BMsEfJAtAdaCDy8iCD9CAn/qX48AHIpfrwAcipAIX4hfpMffSluSkP8CMg0PepADgg3fEgZPiQBGipAGClucli0AupBSBq90zx8iBC9miqxpjkmPAUpJi5WQKdWQK5YwKdYwK5bQKdbQIYYKkAhZCKppjKMBXdWQLQ+GC9WQKFuL1jAoW6vW0ChblgqQCFmKID5JqwAyD+7eSZsAMg7+2GmqkAhZlgprjQA0wK9yAP89ADTP72ppjgCpADTPv25piluJ1ZAqW5CWCFuZ1tAqW6nWMC8FrJA/BWkAUg1fOQT8kC0ANMCfQg0PewA0wT96W5KQ/QHyAX+LA2IK/1pbfwCiDq95AY8ChMBPcgLPfwIJAMsPQgOPiwF6kEIGr3qb+kucBg8AegAKkCkbKYhaYYYKW5MPqkt/D2qQCFkKW6IAztpbkJ8CC57aWQEAVoaEwH96W38AygALG7IN3tyMS30PZMVPYgg/SMlwLEt/AKsbuZkwLIwATQ8iBK746YAq2TAikP8BwKqq2mAtAJvMH+vcD+TED0vOvkverkjJYCjZUCrZUCCiAu/62UAkqQCa0B3QqwAyAN8K2bAo2cAq2eAo2dAiAn/qX40AWIhPiG96X60AWIhPqG+Tip8Ewt/ql/jQ3dqQaNA92NAd2pBA0A3Y0A3aAAjKECYIbDhMRsMAOFk6kAhZClutADTBP3yQPw+ZB7pLfQA0wQ96a5IK/1qWCFuSDV86W6IAntpbkgx+0gE+6FrqWQSkqwUCAT7oWvitAIpcOFrqXEha8g0vWp/SWQhZAg4f/QA0wz9iAT7qqlkEpKsOiKpJPwDKAA0a7wCKkQIBz+LJGu5q7QAuavJJBQyyDv7SBC9pB5TAT3SrADTBP3IND3sANME/cgF/iwaCCv9aW38Akg6veQC/BasNogLPfwU7DTpZApEDjQSuAB8BHgA9DdoAGxsoXDyLGyhcSwBKW50O+gA7GyoAHxsqqgBLGyoALxsqgYimXDha6YZcSFr6XDhcGlxIXCINL1IEr4JBimrqSvYKWdEB6gDCAv8aW38BWgFyAv8aS38AygALG7INL/yMS30PZgoEmlk/ACoFlMK/GGroSvqrUAhcG1AYXCbDIDpbrQA0wT98kD8PmQX6lhhbmkt9ADTBD3INXzII/2pbogDO2luSC57aAAII77pawg3e2lrSDd7SDR/LAWsawg3e0g4f/QByBC9qkAOGAg2/zQ5SD+7SS5MBGluiAM7aW5Ke8J4CC57SD+7RhgSrADTBP3IND3kI0gOPiwJSCP9qIDpbkpAdACogGKIGr3sBIgZ/iwDaW5KQLwBqkFIGr3JBhgpZ0Q+6BRIC/xTMH1ogDmotAG5qHQAuagOKWi6QGloekapaDpT5AGhqCGoYairQHczQHc0PiqMBOivY4A3K4B3OwB3ND4jQDc6NAChZFgeKWipqGkoHiFooahhKBYYKWRyX/QBwggzP+FxihgqQEsqQIsqQMsqQQsqQUsqQYsqQcsqQgsqQlIIMz/oAAknVAKIC/xaEgJMCDS/2g4YKWTSCBB+GiFk7AyoACxsskF8CrJAfAIyQPwBMkE0OGqJJ0QF6BjIC/xoAWxsiDS/8jAFdD2paEg4OTqGIhghZ4g0PeQXqXCSKXBSKWvSKWuSKC/qSCRsojQ+6WekbLIpcGRssilwpGyyKWukbLIpa+RssiEn6AAhJ6knsS38Ayxu6SfkbLmnuaf0O4g1/epaYWrIGv4qGiFrmiFr2iFwWiFwphgprKks8ACYCDQ94qFwRhpwIWumIXCaQCFr2AgLPewHaAFhJ+gAISexLfwELG7pJ/RstDn5p7mn6Se0OwYYCDQ9+ampKbAwGAgLvjwGqAbIC/xIND4IC740Pigakwv8akQJAHQAiQBGGAgLvjw+aAu0N2pAIWQhZMg1/cgF/iwH3ipAIWqhbSFsIWehZ+FnKmQog7QESDX96kUhasgOPiwbHipgqIIoH+MDdyNDdytDtwJGY0P3CmRjaICIKTwrRHQKe+NEdCtFAONnwKtFQONoAIgvfypAoW+IJf7pQEpH4UBhcCi/6D/iND9ytD4WK2gAs0VAxjwFSDQ+CC89ky++CDh/xjQCyCT/DhoaKkAjaACYIaxpbAKChhlsBhlsYWxqQAksDABKgaxKgaxKqqtBtzJFpD5ZbGNBNyKbQfcjQXcraICjQ7cjaQCrQ3cKRDwCan5SKkqSExD/1hgrgfcoP+Y7Qbc7Afc0PKGsaqMBtyMB9ypGY0P3K0N3I2jApjlsYaxSmaxSmaxpbAYaTzFsbBKppzwA0xg+qajMBuiAGkwZbDFsbAc6GkmZbDFsbAXaSxlsMWxkANMEPqltPAdhajQGeapsALGqTjpE+WxZZKFkqWkSQGFpPArhteltPAiraMCKQHQBa2kAtAWqQCFpI2kAqWjEDAwv6KmIOL4pZvQuUy8/qWS8AcwA8awLOawqQCFkuTX0A+K0KClqTC9yRCQuYWWsLWKRZuFm6W08NLGozDFRtdmv6LaIOL4TLz+pZbwBKW08AelozADTJf5RrGpkzjlsWWwCqog4vjmnKW00BGllvAmhaipAIWWqYGNDdyFtKWWhbXwCakAhbSpAY0N3KW/hb2lqAWphbZMvP4gl/uFnKLaIOL4pb7wAoWnqQ8kqhAXpbXQDKa+ytALqQggHP7QBKkAhapMvP5wMdAYpbXQ9aW20PGlp0qlvTADkBgYsBUpD4WqxqrQ3alAhaogjvupAIWr8NCpgIWq0MqltfAKqQQgHP6pAExK+yDR/JADTEj7pqfK8C2lk/AMoAClvdGs8ASpAYW2pbbwS6I95J6QPqaepa2dAQGlrJ0AAejohp5MOvumn+Se8DWlrN0AAdAupa3dAQHQJ+af5p+lk/ALpb2gANGs8BfIhLaltvAHqRAgHP7QCaWT0AWopb2RrCDb/NBDqYCFqniiAY4N3K4N3Ka+yjAChr7Gp/AIpZ7QJ4W+8CMgk/wgjvugAISrsaxFq4WrINv8INH8kPKlq0W98AWpICAc/ky8/qXCha2lwYWsYKkIhaOpAIWkhaiFm4WpYKW9SqlgkAKpsKIAjQbcjgfcrQ3cqRmND9ylAUkIhQEpCGA4ZrYwPKWo0BKpEKIBILH70C/mqKW2EClMV/ylqdAJIK370B3mqdAZIKb70BSlpEkBhaTwD6W9SQGFvSkBRZuFm0y8/ka9xqOlo/A6EPMgl/tYpaXwEqIAhtfGpaa+4ALQAgmAhb3Q2SDR/JAK0JHmraXXhb2wyqAAsayFvUXXhdcg2/zQu6WbSQGFvUy8/sa+0AMgyvypUIWnogh4IL380OqpeCCv+9DjxqfQ3yCX+8arENiiCiC9/Fjmq6W+8DAgjvuiCYalhrbQgwh4rRHQCRCNEdAgyvypf40N3CDd/a2gAvAJjRUDrZ8CjRQDKGAgk/zwl72T/Y0UA72U/Y0VA2ClAQkghQFgOKWs5a6lreWvYOas0ALmrWCi/3ia2CAC/dADbACAjhbQIKP9IFD9IBX9IFv/WGwAoKIFvQ/93QOA0APK0PVgw8LNODCiMKD9GIbDhMSgH7kUA7ACscORw5kUA4gQ8WAx6mb+R/5K85HyDvJQ8jPzV/HK8e32PvEv82b+pfTt9akAqJkCAJkAApkAA8jQ9KI8oAOGsoSzqKkDhcLmwrHBqqlVkcHRwdAPKpHB0cHQCIqRwcjQ6PDkmKqkwhggLf6pCI2CAqkEjYgCYGr8zfsx6iz5qX+NDdyNDd2NANypCI0O3I0O3Y0P3I0P3aIAjgPcjgPdjhjUyo4C3KkHjQDdqT+NAt2p54UBqS+FAK2mAvAKqSWNBNypQEzz/amVjQTcqUKNBdxMbv+Ft4a7hLxghbiGuoS5YKW6yQLQDa2XAkipAI2XAmhghZ2lkAWQhZBgjYUCYJAGroMCrIQCjoMCjIQCYJAGroECrIICjoECjIICYHhsGANIikiYSKl/jQ3drA3dMBwgAv3QA2wCgCC89iDh/9AMIBX9IKP9IBjlbAKgmC2hAqopAfAorQDdKfsFtY0A3a2hAo0N3YopEvANKQLwBiDW/kyd/iAH/yC77ky2/oopAvAGINb+TLb+iikQ8AMgB/+toQKNDd1oqGiqaEDBJz4axRF0Du0MRQbwAkYBuABxAK0B3SkBhaetBt3pHG2ZAo0G3a0H3W2aAo0H3akRjQ/draECjQ3dqf+NBt2NB91MWe+tlQKNBt2tlgKNB92pEY0P3akSTaECjaECqf+NBt2NB92umAKGqGCqrZYCKqiKaciNmQKYaQCNmgJg6uoIaCnvSEiKSJhIur0EASkQ8ANsFgNsFAMgGOWtEtDQ+60Z0CkBjaYCTN39qYGNDdytDtwpgAkRjQ7cTI7uA0xb/0yj/UxQ/UwV/Uwa/UwY/ky57UzH7Uwl/kw0/kyH6kwh/kwT7kzd7Uzv7Uz+7UwM7UwJ7UwH/kwA/kz5/WwaA2wcA2weA2wgA2wiA2wkA2wmA0ye9Ezd9Uzk9kzd9mwoA2wqA2wsA0yb9kwF5UwK5UwA5VJSQllD/uL8SP8=";
const CHAR_ROM = "PGZubmBiPAAYPGZ+ZmZmAHxmZnxmZnwAPGZgYGBmPAB4bGZmZmx4AH5gYHhgYH4AfmBgeGBgYAA8ZmBuZmY8AGZmZn5mZmYAPBgYGBgYPAAeDAwMDGw4AGZseHB4bGYAYGBgYGBgfgBjd39rY2NjAGZ2fn5uZmYAPGZmZmZmPAB8ZmZ8YGBgADxmZmZmPA4AfGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgAZmZmZmZmPABmZmZmZjwYAGNjY2t/d2MAZmY8GDxmZgBmZmY8GBgYAH4GDBgwYH4APDAwMDAwPAAMEjB8MGL8ADwMDAwMDDwAABg8fhgYGBgAEDB/fzAQAAAAAAAAAAAAGBgYGAAAGABmZmYAAAAAAGZm/2b/ZmYAGD5gPAZ8GABiZgwYMGZGADxmPDhnZj8ABgwYAAAAAAAMGDAwMBgMADAYDAwMGDAAAGY8/zxmAAAAGBh+GBgAAAAAAAAAGBgwAAAAfgAAAAAAAAAAABgYAAADBgwYMGAAPGZudmZmPAAYGDgYGBh+ADxmBgwwYH4APGYGHAZmPAAGDh5mfwYGAH5gfAYGZjwAPGZgfGZmPAB+ZgwYGBgYADxmZjxmZjwAPGZmPgZmPAAAABgAABgAAAAAGAAAGBgwDhgwYDAYDgAAAH4AfgAAAHAYDAYMGHAAPGYGDBgAGAAAAAD//wAAAAgcPn9/HD4AGBgYGBgYGBgAAAD//wAAAAAA//8AAAAAAP//AAAAAAAAAAAA//8AADAwMDAwMDAwDAwMDAwMDAwAAADg8DgYGBgYHA8HAAAAGBg48OAAAADAwMDAwMD//8DgcDgcDgcDAwcOHDhw4MD//8DAwMDAwP//AwMDAwMDADx+fn5+PAAAAAAAAP//ADZ/f38+HAgAYGBgYGBgYGAAAAAHDxwYGMPnfjw8fufDADx+ZmZ+PAAYGGZmGBg8AAYGBgYGBgYGCBw+fz4cCAAYGBj//xgYGMDAMDDAwDAwGBgYGBgYGBgAAAM+djY2AP9/Px8PBwMBAAAAAAAAAADw8PDw8PDw8AAAAAD//////wAAAAAAAAAAAAAAAAAA/8DAwMDAwMDAzMwzM8zMMzMDAwMDAwMDAwAAAADMzDMz//78+PDgwIADAwMDAwMDAxgYGB8fGBgYAAAAAA8PDw8YGBgfHwAAAAAAAPj4GBgYAAAAAAAA//8AAAAfHxgYGBgYGP//AAAAAAAA//8YGBgYGBj4+BgYGMDAwMDAwMDA4ODg4ODg4OAHBwcHBwcHB///AAAAAAAA////AAAAAAAAAAAAAP///wMDAwMDA///AAAAAPDw8PAPDw8PAAAAABgYGPj4AAAA8PDw8AAAAADw8PDwDw8PD8OZkZGfmcP/58OZgZmZmf+DmZmDmZmD/8OZn5+fmcP/h5OZmZmTh/+Bn5+Hn5+B/4Gfn4efn5//w5mfkZmZw/+ZmZmBmZmZ/8Pn5+fn58P/4fPz8/OTx/+Zk4ePh5OZ/5+fn5+fn4H/nIiAlJycnP+ZiYGBkZmZ/8OZmZmZmcP/g5mZg5+fn//DmZmZmcPx/4OZmYOHk5n/w5mfw/mZw/+B5+fn5+fn/5mZmZmZmcP/mZmZmZnD5/+cnJyUgIic/5mZw+fDmZn/mZmZw+fn5/+B+fPnz5+B/8PPz8/Pz8P/8+3Pg8+dA//D8/Pz8/PD///nw4Hn5+fn/+/PgIDP7////////////+fn5+f//+f/mZmZ//////+ZmQCZAJmZ/+fBn8P5g+f/nZnz58+Zuf/DmcPHmJnA//nz5///////8+fPz8/n8//P5/Pz8+fP//+ZwwDDmf///+fngefn/////////+fnz////4H////////////n5////Pnz58+f/8OZkYmZmcP/5+fH5+fngf/Dmfnzz5+B/8OZ+eP5mcP/+fHhmYD5+f+Bn4P5+ZnD/8OZn4OZmcP/gZnz5+fn5//DmZnDmZnD/8OZmcH5mcP////n///n/////+f//+fnz/Hnz5/P5/H///+B/4H///+P5/P58+eP/8OZ+fPn/+f/////AAD////348GAgOPB/+fn5+fn5+fn////AAD//////wAA//////8AAP///////////wAA///Pz8/Pz8/Pz/Pz8/Pz8/Pz////Hw/H5+fn5+Pw+P///+fnxw8f////Pz8/Pz8/AAA/H4/H4/H4/Pz48ePHjx8/AAA/Pz8/Pz8AAPz8/Pz8/P/DgYGBgcP///////8AAP/JgICAweP3/5+fn5+fn5+f////+PDj5+c8GIHDw4EYPP/DgZmZgcP/5+eZmefnw//5+fn5+fn5+ffjwYDB4/f/5+fnAADn5+c/P8/PPz/Pz+fn5+fn5+fn///8wYnJyf8AgMDg8Pj8/v//////////Dw8PDw8PDw//////AAAAAAD//////////////////wA/Pz8/Pz8/PzMzzMwzM8zM/Pz8/Pz8/Pz/////MzPMzAABAwcPHz9//Pz8/Pz8/Pzn5+fg4Ofn5//////w8PDw5+fn4OD///////8HB+fn5////////wAA////4ODn5+fn5+cAAP///////wAA5+fn5+fnBwfn5+c/Pz8/Pz8/Px8fHx8fHx8f+Pj4+Pj4+PgAAP///////wAAAP////////////8AAAD8/Pz8/PwAAP////8PDw8P8PDw8P/////n5+cHB////w8PDw//////Dw8PD/Dw8PA8Zm5uYGI8AAAAPAY+Zj4AAGBgfGZmfAAAADxgYGA8AAAGBj5mZj4AAAA8Zn5gPAAADhg+GBgYAAAAPmZmPgZ8AGBgfGZmZgAAGAA4GBg8AAAGAAYGBgY8AGBgbHhsZgAAOBgYGBg8AAAAZn9/a2MAAAB8ZmZmZgAAADxmZmY8AAAAfGZmfGBgAAA+ZmY+BgYAAHxmYGBgAAAAPmA8BnwAABh+GBgYDgAAAGZmZmY+AAAAZmZmPBgAAABja38+NgAAAGY8GDxmAAAAZmZmPgx4AAB+DBgwfgA8MDAwMDA8AAwSMHwwYvwAPAwMDAwMPAAAGDx+GBgYGAAQMH9/MBAAAAAAAAAAAAAYGBgYAAAYAGZmZgAAAAAAZmb/Zv9mZgAYPmA8BnwYAGJmDBgwZkYAPGY8OGdmPwAGDBgAAAAAAAwYMDAwGAwAMBgMDAwYMAAAZjz/PGYAAAAYGH4YGAAAAAAAAAAYGDAAAAB+AAAAAAAAAAAAGBgAAAMGDBgwYAA8Zm52ZmY8ABgYOBgYGH4APGYGDDBgfgA8ZgYcBmY8AAYOHmZ/BgYAfmB8BgZmPAA8ZmB8ZmY8AH5mDBgYGBgAPGZmPGZmPAA8ZmY+BmY8AAAAGAAAGAAAAAAYAAAYGDAOGDBgMBgOAAAAfgB+AAAAcBgMBgwYcAA8ZgYMGAAYAAAAAP//AAAAGDxmfmZmZgB8ZmZ8ZmZ8ADxmYGBgZjwAeGxmZmZseAB+YGB4YGB+AH5gYHhgYGAAPGZgbmZmPABmZmZ+ZmZmADwYGBgYGDwAHgwMDAxsOABmbHhweGxmAGBgYGBgYH4AY3d/a2NjYwBmdn5+bmZmADxmZmZmZjwAfGZmfGBgYAA8ZmZmZjwOAHxmZnx4bGYAPGZgPAZmPAB+GBgYGBgYAGZmZmZmZjwAZmZmZmY8GABjY2Nrf3djAGZmPBg8ZmYAZmZmPBgYGAB+BgwYMGB+ABgYGP//GBgYwMAwMMDAMDAYGBgYGBgYGDMzzMwzM8zMM5nMZjOZzGYAAAAAAAAAAPDw8PDw8PDwAAAAAP//////AAAAAAAAAAAAAAAAAAD/wMDAwMDAwMDMzDMzzMwzMwMDAwMDAwMDAAAAAMzMMzPMmTNmzJkzZgMDAwMDAwMDGBgYHx8YGBgAAAAADw8PDxgYGB8fAAAAAAAA+PgYGBgAAAAAAAD//wAAAB8fGBgYGBgY//8AAAAAAAD//xgYGBgYGPj4GBgYwMDAwMDAwMDg4ODg4ODg4AcHBwcHBwcH//8AAAAAAAD///8AAAAAAAAAAAAA////AQMGbHhwYAAAAAAA8PDw8A8PDw8AAAAAGBgY+PgAAADw8PDwAAAAAPDw8PAPDw8Pw5mRkZ+Zw////8P5wZnB//+fn4OZmYP////Dn5+fw///+fnBmZnB////w5mBn8P///Hnwefn5////8GZmcH5g/+fn4OZmZn//+f/x+fnw///+f/5+fn5w/+fn5OHk5n//8fn5+fnw////5mAgJSc////g5mZmZn////DmZmZw////4OZmYOfn///wZmZwfn5//+DmZ+fn////8Gfw/mD///ngefn5/H///+ZmZmZwf///5mZmcPn////nJSAwcn///+Zw+fDmf///5mZmcHzh///gfPnz4H/w8/Pz8/Pw//z7c+Dz50D/8Pz8/Pz88P//+fDgefn5+f/78+AgM/v////////////5+fn5///5/+ZmZn//////5mZAJkAmZn/58Gfw/mD5/+dmfPnz5m5/8OZw8eYmcD/+fPn///////z58/Pz+fz/8/n8/Pz58///5nDAMOZ////5+eB5+f/////////5+fP////gf///////////+fn///8+fPnz5//w5mRiZmZw//n58fn5+eB/8OZ+fPPn4H/w5n54/mZw//58eGZgPn5/4Gfg/n5mcP/w5mfg5mZw/+BmfPn5+fn/8OZmcOZmcP/w5mZwfmZw////+f//+f/////5///5+fP8efPn8/n8f///4H/gf///4/n8/nz54//w5n58+f/5/////8AAP///+fDmYGZmZn/g5mZg5mZg//DmZ+fn5nD/4eTmZmZk4f/gZ+fh5+fgf+Bn5+Hn5+f/8OZn5GZmcP/mZmZgZmZmf/D5+fn5+fD/+Hz8/Pzk8f/mZOHj4eTmf+fn5+fn5+B/5yIgJScnJz/mYmBgZGZmf/DmZmZmZnD/4OZmYOfn5//w5mZmZnD8f+DmZmDh5OZ/8OZn8P5mcP/gefn5+fn5/+ZmZmZmZnD/5mZmZmZw+f/nJyclICInP+ZmcPnw5mZ/5mZmcPn5+f/gfnz58+fgf/n5+cAAOfn5z8/z88/P8/P5+fn5+fn5+fMzDMzzMwzM8xmM5nMZjOZ//////////8PDw8PDw8PD/////8AAAAAAP//////////////////AD8/Pz8/Pz8/MzPMzDMzzMz8/Pz8/Pz8/P////8zM8zMM2bMmTNmzJn8/Pz8/Pz8/Ofn5+Dg5+fn//////Dw8PDn5+fg4P///////wcH5+fn////////AAD////g4Ofn5+fn5wAA////////AADn5+fn5+cHB+fn5z8/Pz8/Pz8/Hx8fHx8fHx/4+Pj4+Pj4+AAA////////AAAA/////////////wAAAP78+ZOHj5///////w8PDw/w8PDw/////+fn5wcH////Dw8PD/////8PDw8P8PDw8A==";

const backendAdapter = new SIDBackendAdapter(BASIC_ROM, KERNAL_ROM, CHAR_ROM)



class SIDWorkletProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.backendAdapter = backendAdapter
        this.backendAdapter.worklet = this

        // this.traceSwitch = false;

        this.spectrumEnabled = false

        // // container for song infos like: name, author, etc
        this.songInfo = {};

        this.silenceStarttime = -1;
        this.silenceTimeout = 5; // by default 5 secs of silence will end a song

        // // audio buffer handling
        this.sourceBuffer;
        this.sourceBufferLen;
        this.numberOfSamplesRendered = 0;
        this.numberOfSamplesToRender = 0;
        this.sourceBufferIdx = 0;

        // // additional timeout based "song end" handling
        this.currentPlaytime = 0;
        this.currentTimeout = -1;

        this.pan = null;  // default: inactive

        // // --------------- player status stuff ----------

        this.isPaused = true;          // 'end' of a song also triggers this state

        // // setup asyc completion of initialization
        this.isPlayerReady = false;    // this state means that the player is initialized and can be used now
        this.isSongReady = false;    // initialized (including file-loads that might have been necessary)
        this.initInProgress = false;


        this.port.onmessage = this.onmessage.bind(this);

    }

    onmessage(e) {
        const { data } = e;
        console.log('onmessage ' + data.type)
        switch (data.type) {

            case 'loadMusicData':
                this.isSongReady = (this.backendAdapter.loadMusicData(data.sampleRate, data.data, data.options) == 0)
                break;

            case 'evalTrackOptions':
                this.backendAdapter.evalTrackOptions(data.options);
                break;

            case 'updateSongInfo':
                const songInfo = this.backendAdapter.updateSongInfo();
                this.port.postMessage({
                    type: 'songInfoUpdated',
                    songInfo: songInfo
                });
                break;

            case 'resetSampleRate':
                this.backendAdapter.resetSampleRate(data.sampleRate, -1);
                break;

            case 'play':
                this.isPaused = false;
                break;

            case 'pause':
                this.isPaused = true;
                break;

            case 'registerFileData':
                this.backendAdapter.registerFileData(data.name, data.payload)
                break;

            case 'setTrack':
                this.backendAdapter.evalTrackOptions({track: data.track})
                break;

        }
    }

    isStereo() {
        return this.backendAdapter.getChannels() == 2;
    }

    copySamplesMono(resampleBuffer, output1, outSize) {

        let s = 0,
            o = 0;

        if (this.numberOfSamplesRendered + this.numberOfSamplesToRender > outSize) {
            const availableSpace = outSize - this.numberOfSamplesRendered;

            for (let i = 0; i < availableSpace; i++) {
                const ii = i + this.numberOfSamplesRendered;

                o = resampleBuffer[this.sourceBufferIdx++];
                output1[ii] = o;

                s += Math.abs(o);
            }
            this.numberOfSamplesToRender -= availableSpace;
            this.numberOfSamplesRendered = outSize;
        } else {

            for (let i = 0; i < this.numberOfSamplesToRender; i++) {
                const ii = i + this.numberOfSamplesRendered;

                o = resampleBuffer[this.sourceBufferIdx++];
                output1[ii] = o;

                s += Math.abs(o);
            }
            this.numberOfSamplesRendered += this.numberOfSamplesToRender;
            this.numberOfSamplesToRender = 0;
        }
        this.detectSilence(s);
    }

    copySamplesStereo(resampleBuffer, output1, output2, outSize) {
        let s = 0;

        if (this.numberOfSamplesRendered + this.numberOfSamplesToRender > outSize) {
            const availableSpace = outSize - this.numberOfSamplesRendered;

            for (let i = 0; i < availableSpace; i++) {
                const ii = i + this.numberOfSamplesRendered;

                const l = resampleBuffer[this.sourceBufferIdx++];
                const r = resampleBuffer[this.sourceBufferIdx++];

                output1[ii] = l;
                output2[ii] = r;

                s += Math.abs(l) + Math.abs(r);
            }

            this.numberOfSamplesToRender -= availableSpace;
            this.numberOfSamplesRendered = outSize;
        } else {
            for (let i = 0; i < this.numberOfSamplesToRender; i++) {
                const ii = i + this.numberOfSamplesRendered;

                const l = resampleBuffer[this.sourceBufferIdx++];
                const r = resampleBuffer[this.sourceBufferIdx++];

                output1[ii] = l;
                output2[ii] = r;

                s += Math.abs(l) + Math.abs(r);
            }
            this.numberOfSamplesRendered += this.numberOfSamplesToRender;
            this.numberOfSamplesToRender = 0;
        }
        this.detectSilence(s);
    }

    detectSilence(s) {
        if (this.silenceStarttime == 0) {	// i.e. song has been playing
            if (s == 0) {	// silence detected
                this.silenceStarttime = this.currentPlaytime;
            }
        } else if (s > 0) {	// i.e. false alarm or very start of playback
            this.silenceStarttime = 0;
        }
    }

    fillEmpty(outSize, output1, output2) {
        const availableSpace = outSize - this.numberOfSamplesRendered;

        for (let i = 0; i < availableSpace; i++) {
            output1[i + this.numberOfSamplesRendered] = 0;
            if (typeof output2 !== 'undefined') { output2[i + this.numberOfSamplesRendered] = 0; }
        }
        this.numberOfSamplesToRender = 0;
        this.numberOfSamplesRendered = outSize;
    }

    process(inputs, outputs) {

        const genStereo = this.isStereo() && outputs[0].numberOfChannels > 1;

        const output1 = outputs[0][0];
        const output2 = outputs[0][1];

        if ((!this.isSongReady) || this.isPaused) {
            for (let i = 0; i < output1.length; i++) {
                output1[i] = 0;
                if (genStereo) { output2[i] = 0; }
            }
        } else {

            const outSize = output1.length;

            this.numberOfSamplesRendered = 0;

            while (this.numberOfSamplesRendered < outSize) {
                if (this.numberOfSamplesToRender === 0) {
                    let status;
                    if ((this.currentTimeout > 0) && (this.currentPlaytime > this.currentTimeout)) {
                        console.log("'song end' forced after " + this.currentTimeout / this.correctSampleRate + " secs");
                        status = 1;
                    } else {
                        status = this.backendAdapter.computeAudioSamples()
                    }

                    if (status !== 0) {
                        // no frame left
                        this.fillEmpty(outSize, output1, output2);

                        if (status < 0) {
                            console.log('stuck by file-load')
                            // file-load: emu just discovered that we need to load another file
                            // this.isPaused = true;
                            this.isSongReady = false;     // previous init is invalid
                            return true; // complete init sequence must be repeated
                        } else {
                            if (status > 1) {
                                this.trace("playback aborted with an error");
                            }

                            this.isPaused = true;  // stop playback (or this will retrigger again and again before new song is started)
                            this.port.postMessage({
                                type: 'onTrackEnd'
                            });
                            return;
                        }
                    }
                    // refresh just in case they are not using one fixed buffer..
                    this.sourceBuffer = this.backendAdapter.getAudioBuffer();
                    this.sourceBufferLen = this.backendAdapter.getAudioBufferLength();

                    if (this.pan != null)
                    this.backendAdapter.applyPanning(this.sourceBuffer, this.sourceBufferLen, this.pan + 1.0);

                    this.numberOfSamplesToRender = this.backendAdapter.getResampledAudio(this.sourceBuffer, this.sourceBufferLen);

                    this.sourceBufferIdx = 0;
                }

                const resampleBuffer = this.backendAdapter.getResampleBuffer();

                if (genStereo) {
                    this.copySamplesStereo(resampleBuffer, output1, output2, outSize);
                } else {
                    this.copySamplesMono(resampleBuffer, output1, outSize);
                }
            }
            // keep track how long we are playing: just filled one WebAudio buffer which will be played at
            this.currentPlaytime += outSize * this.correctSampleRate / this.sampleRate;

            // silence detection at end of song
            if ((this.silenceStarttime > 0) && ((this.currentPlaytime - this.silenceStarttime) >= this.silenceTimeout * this.correctSampleRate) && (this.silenceTimeout > 0)) {
                this.isPaused = true;  // stop playback (or this will retrigger again and again before new song is started)
                this.port.postMessage({
                    type: 'onTrackEnd'
                });
            }
        }
        return true
    }
}


registerProcessor('sid-worklet-processor', SIDWorkletProcessor);


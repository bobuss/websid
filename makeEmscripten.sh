#!/bin/sh
set -e

emcc -I./src/stereo -I./src/stereo/Common src/stereo/LVCS_Tables.c src/stereo/LVCS_StereoEnhancer.c src/stereo/LVCS_ReverbGenerator.c src/stereo/LVCS_Process.c src/stereo/LVCS_Init.c src/stereo/LVCS_Equaliser.c src/stereo/LVCS_Control.c src/stereo/LVCS_BypassMix.c src/stereo/Common/Abs_32.c src/stereo/Common/Add2_Sat_16x16.c src/stereo/Common/Add2_Sat_32x32.c src/stereo/Common/AGC_MIX_VOL_2St1Mon_D32_WRA.c src/stereo/Common/BP_1I_D16F16C14_TRC_WRA_01.c src/stereo/Common/BP_1I_D16F16Css_TRC_WRA_01_Init.c src/stereo/Common/BP_1I_D16F32C30_TRC_WRA_01.c src/stereo/Common/BP_1I_D16F32Cll_TRC_WRA_01_Init.c src/stereo/Common/BP_1I_D32F32C30_TRC_WRA_02.c src/stereo/Common/BP_1I_D32F32Cll_TRC_WRA_02_Init.c src/stereo/Common/BQ_1I_D16F16C15_TRC_WRA_01.c src/stereo/Common/BQ_1I_D16F16Css_TRC_WRA_01_Init.c src/stereo/Common/BQ_1I_D16F32C14_TRC_WRA_01.c src/stereo/Common/BQ_1I_D16F32Css_TRC_WRA_01_init.c src/stereo/Common/BQ_2I_D16F16C14_TRC_WRA_01.c src/stereo/Common/BQ_2I_D16F16C15_TRC_WRA_01.c src/stereo/Common/BQ_2I_D16F16Css_TRC_WRA_01_Init.c src/stereo/Common/BQ_2I_D16F32C13_TRC_WRA_01.c src/stereo/Common/BQ_2I_D16F32C14_TRC_WRA_01.c src/stereo/Common/BQ_2I_D16F32C15_TRC_WRA_01.c src/stereo/Common/BQ_2I_D16F32Css_TRC_WRA_01_init.c src/stereo/Common/BQ_2I_D32F32C30_TRC_WRA_01.c src/stereo/Common/BQ_2I_D32F32Cll_TRC_WRA_01_Init.c src/stereo/Common/Copy_16.c src/stereo/Common/Core_MixHard_2St_D32C31_SAT.c src/stereo/Common/Core_MixInSoft_D32C31_SAT.c src/stereo/Common/Core_MixSoft_1St_D32C31_WRA.c src/stereo/Common/dB_to_Lin32.c src/stereo/Common/DC_2I_D16_TRC_WRA_01.c src/stereo/Common/DC_2I_D16_TRC_WRA_01_Init.c src/stereo/Common/DelayAllPass_Sat_32x16To32.c src/stereo/Common/DelayMix_16x16.c src/stereo/Common/DelayWrite_32.c src/stereo/Common/FO_1I_D16F16C15_TRC_WRA_01.c src/stereo/Common/FO_1I_D16F16Css_TRC_WRA_01_Init.c src/stereo/Common/FO_1I_D32F32C31_TRC_WRA_01.c src/stereo/Common/FO_1I_D32F32Cll_TRC_WRA_01_Init.c src/stereo/Common/FO_2I_D16F32C15_LShx_TRC_WRA_01.c src/stereo/Common/FO_2I_D16F32Css_LShx_TRC_WRA_01_Init.c src/stereo/Common/From2iToMono_16.c src/stereo/Common/From2iToMono_32.c  src/stereo/Common/From2iToMS_16x16.c src/stereo/Common/InstAlloc.c src/stereo/Common/Int16LShiftToInt32_16x32.c src/stereo/Common/Int32RShiftToInt16_Sat_32x16.c src/stereo/Common/JoinTo2i_32x32.c src/stereo/Common/LoadConst_16.c src/stereo/Common/LoadConst_32.c src/stereo/Common/LVC_Core_MixHard_1St_2i_D16C31_SAT.c src/stereo/Common/LVC_Core_MixHard_2St_D16C31_SAT.c src/stereo/Common/LVC_Core_MixInSoft_D16C31_SAT.c src/stereo/Common/LVC_Core_MixSoft_1St_2i_D16C31_WRA.c src/stereo/Common/LVC_Core_MixSoft_1St_D16C31_WRA.c src/stereo/Common/LVC_Mixer_GetCurrent.c src/stereo/Common/LVC_Mixer_GetTarget.c src/stereo/Common/LVC_Mixer_Init.c src/stereo/Common/LVC_Mixer_SetTarget.c src/stereo/Common/LVC_Mixer_SetTimeConstant.c src/stereo/Common/LVC_Mixer_VarSlope_SetTimeConstant.c src/stereo/Common/LVC_MixInSoft_D16C31_SAT.c src/stereo/Common/LVC_MixSoft_1St_2i_D16C31_SAT.c src/stereo/Common/LVC_MixSoft_1St_D16C31_SAT.c src/stereo/Common/LVC_MixSoft_2St_D16C31_SAT.c src/stereo/Common/LVM_FO_HPF.c src/stereo/Common/LVM_FO_LPF.c src/stereo/Common/LVM_GetOmega.c src/stereo/Common/LVM_Mixer_TimeConstant.c src/stereo/Common/LVM_Polynomial.c src/stereo/Common/LVM_Power10.c src/stereo/Common/LVM_Timer.c src/stereo/Common/LVM_Timer_Init.c src/stereo/Common/Mac3s_Sat_16x16.c src/stereo/Common/Mac3s_Sat_32x16.c src/stereo/Common/MixInSoft_D32C31_SAT.c src/stereo/Common/MixSoft_1St_D32C31_WRA.c src/stereo/Common/MixSoft_2St_D32C31_SAT.c src/stereo/Common/MonoTo2I_16.c src/stereo/Common/MonoTo2I_32.c src/stereo/Common/MSTo2i_Sat_16x16.c src/stereo/Common/mult3s_16x16.c src/stereo/Common/Mult3s_32x16.c src/stereo/Common/NonLinComp_D16.c src/stereo/Common/PK_2I_D32F32C14G11_TRC_WRA_01.c src/stereo/Common/PK_2I_D32F32C30G11_TRC_WRA_01.c src/stereo/Common/PK_2I_D32F32CllGss_TRC_WRA_01_Init.c src/stereo/Common/PK_2I_D32F32CssGss_TRC_WRA_01_Init.c src/stereo/Common/Shift_Sat_v16xv16.c src/stereo/Common/Shift_Sat_v32xv32.c src/loaders.cpp src/filter.cpp src/filter6581.cpp src/filter8580.cpp src/wavegenerator.cpp src/envelope.cpp src/sid.cpp src/memory.c src/system.cpp src/cpu.c src/hacks.c src/cia.c src/vic.c src/core.cpp src/digi.cpp src/sidplayer.cpp \
    -s WASM=1 \
    -s VERBOSE=0 \
    -fno-rtti \
    -fno-exceptions \
    -s ASSERTIONS=0 \
    -s FORCE_FILESYSTEM=1  \
    -Wno-pointer-sign \
    -I./src \
    -I./src/stereo \
    -I./src/stereo/Common \
    -Os \
    -O3 \
    --closure 1 \
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'UTF8ToString']" \
    -s EXPORTED_FUNCTIONS="['_getStereoLevel','_setStereoLevel','_getReverbLevel','_setReverbLevel','_getHeadphoneMode','_setHeadphoneMode','_getCutoff6581', '_getFilterConfig6581', '_setFilterConfig6581', '_loadSidFile', '_playTune', '_getMusicInfo', '_getSampleRate', '_getSoundBuffer', '_getSoundBufferLen', '_computeAudioSamples', '_enableVoices', '_envIsSID6581', '_envSetSID6581', '_envIsNTSC', '_envSetNTSC', '_getBufferVoice1', '_getBufferVoice2', '_getBufferVoice3', '_getBufferVoice4', '_setRegisterSID', '_getRegisterSID', '_getRAM', '_setRAM', '_getDigiType', '_getDigiTypeDesc', '_getDigiRate', '_getNumberTraceStreams', '_getTraceStreams', '_countSIDs', '_getSIDRegister', '_getSIDRegister2', '_setSIDRegister', '_getSIDBaseAddr', '_readVoiceLevel', '_initPanningCfg', '_getPanning', '_setPanning', '_malloc', '_free']" \
    -o htdocs/sid.js \
    -s SINGLE_FILE=1 \
    -s BINARYEN_ASYNC_COMPILATION=0 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ENVIRONMENT=worker \
    -s MODULARIZE=1 \
    -s EXPORT_NAME=backend_sid \
    -s "BINARYEN_METHOD='native-wasm'" \
    --extern-pre-js pre.js \
    --extern-post-js post.js



# # cat shell-pre.js > htdocs/tinyrsid3.js
# # cat htdocs/tinyrsid.js >> htdocs/tinyrsid3.js
# # cat shell-post.js >> htdocs/tinyrsid3.js
# # cat htdocs/tinyrsid3.js > htdocs/backend_tinyrsid.js
# # cat tinyrsid_adapter.js >> htdocs/backend_tinyrsid.js

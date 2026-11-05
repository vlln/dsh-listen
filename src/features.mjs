export const NUMERIC_FEATURES=['signal_image','levels','energy','spectral_peaks','band_energy','chroma','pitch','pitch_frames','onsets','tempo'];
export const FEATURES=['transcript','events',...NUMERIC_FEATURES];
export const FEATURE_DESCRIPTIONS={
 transcript:'Speech transcription text and source-time segments from the configured ASR.',
 events:'Sound-label candidates and scores from the configured event extractor.',
 signal_image:'Waveform and mel-spectrogram image with plotting parameters; no numerical levels or energy arrays.',
 levels:'Per-channel RMS, dBFS, sample peak, DC, near-full-scale/overrange counts and stereo statistics.',
 energy:'Time-binned RMS, quantiles, dynamic range and low-energy intervals.',
 spectral_peaks:'Ranked spectral local maxima with frequency in Hz and relative power in dB.',
 band_energy:'Power fraction within dsp_band_hz; requires dsp_band_hz.',
 chroma:'Twelve pitch-class power values with A440 reference.',
 pitch:'Sparse pitch-candidate frequency quantiles, span and sampled-window availability.',
 pitch_frames:'Source-time windows with frequency and periodicity candidates.',
 onsets:'Source-time energy-onset candidates and relative strengths.',
 tempo:'Tempo candidates in BPM with periodicity scores.'
};

// needed to work in a worklet (firefox issue)
// https://bugzilla.mozilla.org/show_bug.cgi?id=1572644
// https://github.com/emscripten-core/emscripten/issues/6230
const self = {
    location: {
        href: "https://localhost"
    }
}

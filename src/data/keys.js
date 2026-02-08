export const KEY_GROUPS = {
    "Basic": [
        "KC.A", "KC.B", "KC.C", "KC.D", "KC.E", "KC.F", "KC.G", "KC.H", "KC.I", "KC.J", "KC.K", "KC.L", "KC.M", 
        "KC.N", "KC.O", "KC.P", "KC.Q", "KC.R", "KC.S", "KC.T", "KC.U", "KC.V", "KC.W", "KC.X", "KC.Y", "KC.Z",
        "KC.N1", "KC.N2", "KC.N3", "KC.N4", "KC.N5", "KC.N6", "KC.N7", "KC.N8", "KC.N9", "KC.N0"
    ],
    "Modifiers": [
        "KC.LCTRL", "KC.LSHIFT", "KC.LALT", "KC.LGUI", "KC.RCTRL", "KC.RSHIFT", "KC.RALT", "KC.RGUI", "KC.MO(1)"
    ],
    "Navigation": [
        "KC.ENT", "KC.ESC", "KC.BSPC", "KC.TAB", "KC.SPC", "KC.MINS", "KC.EQL", "KC.LBRC", "KC.RBRC", "KC.BSLS",
        "KC.SCLN", "KC.QUOT", "KC.GRV", "KC.COMM", "KC.DOT", "KC.SLSH", "KC.CAPS", 
        "KC.UP", "KC.DOWN", "KC.LEFT", "KC.RIGHT", "KC.PGUP", "KC.PGDN", "KC.HOME", "KC.END", "KC.INS", "KC.DEL", "KC.PSCR", "KC.SLCK", "KC.PAUS"
    ],
    "F-Keys": [
        "KC.F1", "KC.F2", "KC.F3", "KC.F4", "KC.F5", "KC.F6", "KC.F7", "KC.F8", "KC.F9", "KC.F10", "KC.F11", "KC.F12",
        "KC.F13", "KC.F14", "KC.F15", "KC.F16", "KC.F17", "KC.F18", "KC.F19", "KC.F20", "KC.F21", "KC.F22", "KC.F23", "KC.F24"
    ],
    "Media": [
        "KC.VOLU", "KC.VOLD", "KC.MUTE", "KC.MPLY", "KC.MSTP", "KC.MNXT", "KC.MPRV", "KC.MSEL"
    ],
    "Mouse": [
        "KC.MS_UP", "KC.MS_DOWN", "KC.MS_LEFT", "KC.MS_RIGHT", "KC.BTN1", "KC.BTN2", "KC.BTN3", "KC.WH_UP", "KC.WH_DOWN"
    ],
    "Browser": [
        "KC.WBAK", "KC.WFWD", "KC.WREF", "KC.WSTOP", "KC.WSRCH", "KC.WHOM"
    ],
    "App": [
        "KC.CALC", "KC.MAIL", "KC.MYCM"
    ],
    "Special": [
        "KC.NO", "KC.TRNS", "KC.RESET", "KC.RELOAD", "KC.DEBUG"
    ]
};

export const ALL_KEYS = Object.values(KEY_GROUPS).flat();

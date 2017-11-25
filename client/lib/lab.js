function getFinishLabs() {
    const sto = wx.getStorageSync('finishLabs');
    if (sto) {
        return JSON.parse(sto);
    }
    return {};
}

function finish(id) {
    const current = getFinishLabs();
    current[id] = 1;
    wx.setStorageSync('finishLabs', JSON.stringify(current));
}

function clear() {
    wx.setStorageSync('finishLabs', '');
}

module.exports = { getFinishLabs, finish, clear };
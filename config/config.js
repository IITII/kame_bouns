let config = {
    cookies: '' || process.env.KAME_COOKIES,
    // 抓取间隔， 60分钟
    interval: 60,
    tg: {
        channelId: '' || process.env.KAME_CHID,
        token: '' || process.env.KAME_TOKEN,
    }
}

config.interval *= 1000 * 60

module.exports = config
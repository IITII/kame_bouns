let config = {
    cookies: '' || process.env.KAME_COOKIES,
    // 抓取间隔， 60分钟
    interval: 60,
    tg: {
        channelId: '' || process.env.KAME_CHID,
        token: '' || process.env.KAME_TOKEN,
    },
    axios: {
        timeout: 1000 * 20,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
        },
    },
}

config.interval *= 1000 * 60

module.exports = config
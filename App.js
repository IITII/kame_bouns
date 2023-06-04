/**
 * @author IITII <ccmejx@gmail.com>
 * @date 2022/06/25
 */
'use strict'
const config = require('./config/config'),
    { axios } = require('./axios_client'),
    { load } = require('cheerio'),
    node_url = require('url'),
    fs = require('fs'),
    path = require('path'),
    cloudscraper = require('cloudscraper')

const url = 'https://kamept.com/medal.php'
const file = path.resolve(__dirname, './cache.json')

async function getDom() {
    return await cloudscraper({
        uri: url,
        headers: {
            Cookie: config.cookies,
        }
    })
        // return await axios.get(url, {
        //     responseType: 'document',
        //     headers: {
        //         'referer': url,
        //         Host: new URL(url).host,
        //         Connection: 'keep-alive',
        //         Cookie: config.cookies,
        //     },
        // })
        // .then(res => {return load(res?.data)})
        .then(res => { return load(res) })
        .then($ => {
            if ($.text().includes('未登录')) {
                throw new Error('Cookies 过期')
            }
            return $
        })
}

function loadJson() {
    let res = []
    if (fs.existsSync(file)) {
        try {
            res = JSON.parse(fs.readFileSync(file))
        } catch (e) {
            console.log(`read failed: ${file}`);
        }
    }
    return res
}
function saveJson(json) {

    fs.writeFileSync(file, JSON.stringify(json))
}
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function tgNotify(text) {
    let params = {
        chat_id: config.tg.channelId,
        text,
    }
    axios.post(`https://api.telegram.org/bot${config.tg.token}/sendMessage`, params)
        .then(_ => console.log(`sent: ${text}`))
        .catch(e => {
            if (config.isCron) {
                throw e
            } else {
                console.log(`tgNotify: ${e.message}`)
            }
        })
}

async function task() {
    console.log(`start task`);
    await getDom().then(async jQuery => {
        let bouns = jQuery("#outer table:contains('库存') tr").filter(function (i, el) {
            // this === el
            return jQuery(this).find("td img[class='preview']").length > 0
        }).filter(function (i, el) {
            return jQuery(this).find("td h1:contains('勋章')").length === 0
        }).map((i, el) => {
            let title, desc, img, price, canBuyTime, vaildityPeriod
            // img = jQuery(el).find("img[class='preview']").map((i, el) => el.currentSrc).toArray()[0]
            img = jQuery(el).find("img[class='preview']").map((i, el) => el.attribs.src).toArray()[0]
            img = node_url.resolve(url, img)
            title = jQuery(el).find('h1').text().trim()
            desc = jQuery(el).find("td:nth-child(2)").text()
            desc = (desc || '').replace(title, '').trim()
            canBuyTime = jQuery(el).find('td:nth-child(3)').text()
            vaildityPeriod = jQuery(el).find('td:nth-child(4)').text()
            price = jQuery(el).find('td:nth-child(6)').text()
            
            return { img, title, desc, canBuyTime,vaildityPeriod, price }
        })
        let oldJson = loadJson()
        let newBouns = bouns.filter(b => !oldJson.some(o => o.title === b.title))
        for (const n of newBouns) {
            console.log(bouns);
            let msg = `#名称 _${n.title}_\n#价格 ${n.price}\n#可购买时间 ${n.canBuyTime}\n#购买后有效期(天) ${n.vaildityPeriod}\n${n.desc} ${n.img}`
            await tgNotify(msg)
            await sleep(1000)
        }
        saveJson(bouns)
    }).catch(async e => {
        console.log(`task: ${e.message}`)
        await tgNotify(e.message)
        if (config.isCron) {
            throw e
        }
        await sleep(1000)
    })
}

async function main() {
    if (config.isCron) {
        await task()
    } else {
    setInterval(async () => {
        await task()
    }, config.interval)
    }
}

main()

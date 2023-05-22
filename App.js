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
    path = require('path')


const url = 'https://kamept.com/mybonus.php'
const file = path.resolve(__dirname, './cache.json')

async function getDom() {
    return await axios.get(url, {
        responseType: 'document',
        headers: {
            'referer': url,
            Host: new URL(url).host,
            Connection: 'keep-alive',
            Cookie: config.cookies,
        },
    })
        .then(res => load(res?.data))
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
    .catch(e => console.log(e.message))
}

async function task() {
    console.log(`start task`);
    await getDom().then(async $ => {
        let bouns = $("#outer table:contains('上传量') tr").filter(function (i, el) {
            // this === el
            return $(this).find("td[align='left'] img").length > 0
        }).map((i, el) => {
            return {
                title: $(el).find('h1').text(),
                desc: $(el).find("div[style*=padding]").text(),
                img: $(el).find('img').map((i, el) => el.attribs.src).toArray()[0],
                price: $(el).find('td:nth-child(4)').text()
            }
        }).toArray().map(_ => ({ ..._, img: node_url.resolve(url, _.img) }))
        let oldJson = loadJson()
        let newBouns = bouns.filter(b => !oldJson.some(o => o.title === b.title))
        for (const n of newBouns) {
            console.log(bouns);
            let msg = `#名称 _${n.title}_\n#价格 ${n.price}\n${n.desc} ${n.img}`
            await tgNotify(msg)
            await sleep(1000)
        }
        saveJson(bouns)
    }).catch(async e => {
        await tgNotify(e.message)
        await sleep(1000)
    })
}

async function main() {
    setInterval(async () => {
        await task()
    }, config.interval)
}

main()

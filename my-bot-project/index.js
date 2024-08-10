const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const games = {
    1: {
        name: 'Riding Extreme 3D',
        appToken: 'd28721be-fd2d-4b45-869e-9f253b554e50',
        promoId: '43e35910-c168-4634-ad4f-52fd764a843f',
    },
    2: {
        name: 'Chain Cube 2048',
        appToken: 'd1690a07-3780-4068-810f-9b5bbf2931b2',
        promoId: 'b4170868-cef0-424f-8eb9-be0622e8e8e3',
    },
    3: {
        name: 'My Clone Army',
        appToken: '74ee0b5b-775e-4bee-974f-63e7f4d5bacb',
        promoId: 'fe693b26-b342-4159-8808-15e3ff7f8767',
    },
    4: {
        name: 'Train Miner',
        appToken: '82647f43-3f87-402d-88dd-09a90025313f',
        promoId: 'c4480ac7-e178-4973-8061-9ed5b2e17954',
    }
};

bot.start((ctx) => {
    ctx.reply('Welcome to the Game Key Generator bot! You can generate promo keys for games using this bot.\n\n' +
        'Commands:\n' +
        '/games - List available games\n' +
        '/generate [game_id] [key_count] - Generate a specific number of keys for a game\n');
});

bot.help((ctx) => {
    ctx.reply('Here are the commands you can use:\n\n' +
        '/games - List available games\n' +
        '/generate [game_id] [key_count] - Generate a specific number of keys for a game\n' +
        '/start - Restart the bot\n');
});

bot.command('games', (ctx) => {
    const gameList = Object.keys(games).map(id => `${id}. ${games[id].name}`).join('\n');
    ctx.reply(`Available games:\n${gameList}\n\nUse /generate [game_id] [key_count] to generate keys.`);
});

bot.command('generate', async (ctx) => {
    const messageParts = ctx.message.text.split(' ');
    const gameChoice = parseInt(messageParts[1]);
    const keyCount = parseInt(messageParts[2]);

    if (!gameChoice || !keyCount) {
        return ctx.reply('Usage: /generate [game_id] [key_count]\nExample: /generate 1 5');
    }

    const game = games[gameChoice];
    if (!game) {
        return ctx.reply('Invalid game choice. Please use /games to list available games.');
    }

    ctx.reply(`Generating ${keyCount} keys for ${game.name}...`);

    const keys = await Promise.all(Array.from({ length: keyCount }, () => generateKeyProcess(game)));

    ctx.reply(`Generated keys:\n${keys.filter(k => k).join('\n')}`);
});

const generateKeyProcess = async (game) => {
    const clientId = generateClientId();
    let clientToken;

    try {
        clientToken = await login(clientId, game.appToken);
    } catch (error) {
        return `Failed to login: ${error.message}`;
    }

    for (let i = 0; i < 11; i++) {
        await sleep(20000 * delayRandom());
        const hasCode = await emulateProgress(clientToken, game.promoId);
        if (hasCode) {
            break;
        }
    }

    try {
        const key = await generateKey(clientToken, game.promoId);
        return key;
    } catch (error) {
        return `Failed to generate key: ${error.message}`;
    }
};

const generateClientId = () => {
    const timestamp = Date.now();
    const randomNumbers = Array.from({ length: 19 }, () => Math.floor(Math.random() * 10)).join('');
    return `${timestamp}-${randomNumbers}`;
};

const login = async (clientId, appToken) => {
    const response = await fetch('https://api.gamepromo.io/promo/login-client', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            appToken,
            clientId,
            clientOrigin: 'deviceid'
        })
    });

    if (!response.ok) {
        throw new Error('Failed to login');
    }

    const data = await response.json();
    return data.clientToken;
};

const emulateProgress = async (clientToken, promoId) => {
    const response = await fetch('https://api.gamepromo.io/promo/register-event', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${clientToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            promoId,
            eventId: generateUUID(),
            eventOrigin: 'undefined'
        })
    });

    if (!response.ok) {
        return false;
    }

    const data = await response.json();
    return data.hasCode;
};

const generateKey = async (clientToken, promoId) => {
    const response = await fetch('https://api.gamepromo.io/promo/create-code', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${clientToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            promoId
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate key');
    }

    const data = await response.json();
    return data.promoCode;
};

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const delayRandom = () => Math.random() / 3 + 1;

module.exports = (req, res) => {
    bot.handleUpdate(req.body);
    res.status(200).send('OK');
};

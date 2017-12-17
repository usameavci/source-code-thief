var Thief = require("./thief");

var config = {
    baseUrl: 'https://millennium.dev/aksesuar/sunset-tekli-sandalyes',
};

var thief = new Thief(config);

thief.scanUrls().then(ctx => {
    ctx.generatePages();
});
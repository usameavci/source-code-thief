const FileSystem = require('fs');
const Path = require('path');
const Axios = require("axios");
const Mkdirp = require('mkdirp');
const Del = require('del');
const Url = require('url');
const Log = require('./log');


class Thief {
    constructor(config) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        const baseDomain = this.getBaseUrl(config.baseUrl);

        const configDefaults = {
            urlRegexp: '<a\\s+(?:[^>]*?\\s+)?href=(["\'])' + baseDomain + '/(.*?)(["\'])',
            dirPages: Path.join(__dirname, '../', Url.parse(baseDomain).hostname),
            baseDomain: baseDomain,
        };

        this.config = Object.assign(configDefaults, config);
    }

    getBaseUrl(url){
        const u = Url.parse(url);

        url = u.protocol;
        url += '//';
        url += u.hostname;

        if (u.port) {
            url += ':';
            url += u.port;
        }

        return url;
    }

    scanUrls() {
        if (!FileSystem.existsSync(this.config.dirPages)) {
            Mkdirp.sync(this.config.dirPages);
            Log.success(`${ this.config.dirPages } folder created`);
        }

        // Del.sync(`${ this.config.dirPages }/**/*`);
        // Log.success(`Deleted old html files in page folder`);

        return new Promise((resolve, reject) => {
            Axios
                .get(this.config.baseUrl)
                .then(response => {
                    const pageSource = response.data;
                    const allMatches = pageSource.match(new RegExp(this.config.urlRegexp, 'g'));

                    let urlList = [];

                    allMatches.map(matched => {
                        const parsedUrl = matched.match(new RegExp(this.config.urlRegexp))
                        urlList.push(parsedUrl[2]);
                    });

                    urlList.unshift('/');

                    this.urlList = urlList;
                    resolve(this);
                })
                .catch(reject);
        });
    }

    getUrlList(index) {
        let resultList = [];
        const filteredUrlList = this.urlList.filter(url => {
            const exp = /.*\.(png|ico|jpg|jpeg|css|js)/;
            return !exp.test(url);
        });


        filteredUrlList.map(current => {
            if (resultList.indexOf(current) == -1) {
                resultList.push(current);
            }
        });

        if (index >= 0) {
            return resultList[index];
        }

        return resultList;
    }

    generatePages(index) {
        index = index ||  0;

        if (index >= this.getUrlList().length) {
            Log.line(2);
            Log.success(`
###############
####
#### ALL PAGES SAVING COMPLETED!
####
###############
`);
            process.exit(128);
        }

        const url = this.getUrlList(index);
        const remoteUrl = url == '/' ? `${ this.config.baseDomain }` : `${ this.config.baseDomain }/${ url }`;
        const fileName = url == '/' ? `index.html` : `${ url }.html`;
        const filePath = `${ this.config.dirPages }/${ fileName }`;

        if (FileSystem.existsSync(filePath)) {
            Log.info(`Passing ${ filePath }  folder creation..`);
            this.generatePages(index + 1);
        } else {
            Log.info(`Fetching: ${ remoteUrl }`);
            Axios
                .get(remoteUrl)
                .then(response => {
                    const pageSource = response.data;

                    this.savePage(filePath, pageSource)
                        .then(response => {
                            if (response.status == 'created') {
                                Log.success(`${ fileName } page created successfully`);
                            } else if (response.status == 'skipped') {
                                Log.info(`Skipping ${ fileName } page creation`);
                            }

                            this.generatePages(index + 1);
                        })
                        .catch(response => {
                            Log.error(`${ fileName } page creation error`, response.error);
                        });
                })
                .catch((error) => {
                    Log.error(`${ remoteUrl } fetching error!`);
                });
        }
    }

    savePage(filePath, pageSource) {
        return new Promise((resolve, reject) => {
            if (!FileSystem.existsSync(filePath)) {
                pageSource = pageSource.replace(new RegExp('<a(.*?)?href=(["\'])' + this.config.baseDomain + '(.*?)(["\'])', 'g'), '<a$1href="$3.html"');
                pageSource = pageSource.replace(new RegExp(this.config.baseDomain, 'g'), '');
                pageSource = pageSource.replace(new RegExp('href=(["\']).html(["\'])', 'g'), 'href="/index.html"');

                const dirPath = Path.dirname(filePath);
                if (!FileSystem.existsSync(dirPath)) {
                    Mkdirp.sync(dirPath);
                    Log.success(`${ dirPath } folder created`);
                }

                FileSystem.writeFile(filePath, pageSource, function(err) {
                    if (err) {
                        reject({ status: 'error', error: err });
                    }

                    resolve({ status: 'created' });
                });
            } else {
                resolve({ status: 'skipped' });
            }
        });
    }
}

module.exports = Thief;
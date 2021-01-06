var isError;
const TIMEOUT_MS = 60000;
exports.handler = function (event, context, callback) {
    isError = false;
    console.log('Running index.handler');
    console.log('==================================');
    console.log('event', event);
    console.log('==================================');
    testRepo(callback);
};

function testRepo(callback) {
    var https = require('https');
    var url = require('url');
    var serverUrl = url.parse(process.env["REPO_STATUS_ENDPOINT"]);

    const options = {
        host: serverUrl.host,
        path: serverUrl.pathname,
        method: 'GET',
        headers: { 'User-Agent': 'statuspage-lambda' }
      };
    const request = https.get(options, function (res) {
        console.log('Got response for repo stack status: ' + res.statusCode);
        // assemble the response body and check for down
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
            console.log('Response body: ', body);
            if (res.statusCode == 200) {
                var jsonBody = JSON.parse(body);
                if (jsonBody.status !== 'READ_WRITE') {
                    updateRepoStatus('under_maintenance', callback, jsonBody.currentMessage);
                } else {
                    updateRepoStatus('operational', callback);
                }
            } else {
                updateRepoStatus('major_outage', callback, res.statusCode + ' - ' + res.statusMessage);
            }
        });
    }).on('error', function (e) {
        updateRepoStatus('major_outage', callback, e.message);
    });
    request.setTimeout( TIMEOUT_MS, function( ) {
        updateRepoStatus('major_outage', callback, 'Unable to connect to the Synapse backend services.');
    });
    request.end()
}

function updateRepoStatus(componentStatus, callback, statusMessage) {
    if (statusMessage) {
        console.log("Got repo status: " + statusMessage);
    }
    var componentId = process.env["STATUS_PAGE_IO_REPO_COMPONENT_ID"];
    updateStatusIoComponent(componentId, componentStatus);
    testWebsite(callback);
}

function updateWebsiteStatus(componentStatus, callback, error) {
    if (error) {
        console.log("Got website error: " + error);
    }
    var componentId = process.env["STATUS_PAGE_IO_WEBSITE_COMPONENT_ID"];
    updateStatusIoComponent(componentId, componentStatus, callback);
}

function testWebsite(callback) {
    var https = require('https');
    var url = process.env["WEBSITE_URL_ENDPOINT"];
    const request = https.get(url, function (res) {
        console.log('Got response for website: ' + res.statusCode);
        if (res.statusCode !== 200) {
            updateWebsiteStatus('major_outage', callback, res.statusCode + ' - ' + res.statusMessage);
        } else {
            updateWebsiteStatus('operational', callback);
        }
    }).on('error', function (e) {
        updateWebsiteStatus('major_outage', callback, e.message);
    });
    request.setTimeout( TIMEOUT_MS, function( ) {
        updateWebsiteStatus('major_outage', callback, 'Unable to connect to the Synapse website.');
    });    
    request.end()    
}

function updateStatusIoComponent(componentId, componentStatus, callback) {
    if (!isError) {
        isError = componentStatus == 'major_outage';
    }
    var https = require('https');
    // get STATUS_PAGE_IO_API_KEY from env
    var apikey = process.env["STATUS_PAGE_IO_API_KEY"];
    var url = 'api.statuspage.io';
    var pageId = process.env["STATUS_PAGE_IO_PAGE_ID"];
    var postData = 'component[status]=' + componentStatus;

    var options = {
        hostname: url,
        port: 443,
        path: '/v1/pages/'+pageId+'/components/'+componentId+'.json',
        method: 'PATCH',
        headers: {
            'Authorization': 'OAuth '+apikey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    };

    var req = https.request(options, (res) => {
        res.on('data', (d) => {
            process.stdout.write(d);
            if (callback) {
                console.log('Stopping index.handler');
                if (isError) {
                    callback(new Error("Synapse component unreachable"));
                } else {
                    callback(null, 'done');
                }
            }
        });
    });

    req.on('error', (e) => {
        console.error(e);
        if (callback) {
            callback(e);
        }
    });

    req.write(postData);
    req.end();
}


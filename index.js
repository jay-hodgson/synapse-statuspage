exports.handler = function (event, context, callback) {
    console.log('Running index.handler');
    console.log('==================================');
    console.log('event', event);
    console.log('==================================');
    testRepo(callback);
};

function testRepo(callback) {
    var https = require('https');
    var url = 'https://repo-prod.prod.sagebase.org/repo/v1/admin/synapse/status';
    https.get(url, function (res) {
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
                    updateRepoStatus('operational', callback, jsonBody.currentMessage);
                }
            } else {
                updateRepoStatus('major_outage', callback, res.statusCode + ' - ' + res.statusMessage);
            }
        });
    }).on('error', function (e) {
        updateRepoStatus('major_outage', callback, e.message);
    });
}

function updateRepoStatus(componentStatus, callback, error) {
    if (error) {
        console.log("Got repo error: " + error);
    }
    var componentId = 'sb280jd7bbs6';
    updateStatusIoComponent(componentId, componentStatus);
    testWebsite(callback);
}

function updateWebsiteStatus(componentStatus, callback, error) {
    if (error) {
        console.log("Got website error: " + error);
    }
    var componentId = 'dcgr2fz40pqc';
    updateStatusIoComponent(componentId, componentStatus, callback);
}

function testWebsite(callback) {
    var https = require('https');
    var url = 'https://www.synapse.org';
    https.get(url, function (res) {
        console.log('Got response for website: ' + res.statusCode);
        if (res.statusCode !== 200) {
            updateWebsiteStatus('major_outage', callback, res.statusCode + ' - ' + res.statusMessage);
        } else {
            updateWebsiteStatus('operational', callback);
        }
    }).on('error', function (e) {
        updateWebsiteStatus('major_outage', callback, e.message);
    });
}

function updateStatusIoComponent(componentId, componentStatus, callback) {
    var https = require('https');
    // get STATUS_PAGE_IO_API_KEY from env
    var apikey = process.env["STATUS_PAGE_IO_API_KEY"];
    var url = 'api.statuspage.io';
    var pageId = 'kh896k90gyvg';
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
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);

        res.on('data', (d) => {
            process.stdout.write(d);
            if (callback) {
                console.log('Stopping index.handler');
                callback(null, 'done');
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


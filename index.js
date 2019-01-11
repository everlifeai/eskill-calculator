'use strict'
const cote = require('cote')
const u = require('elife-utils')

/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice and register with the communication manager.
 */
function main() {
    startMicroservice()
    registerWithCommMgr()
}

const commMgrClient = new cote.Requester({
    name: 'Calculator -> CommMgr',
    key: 'everlife-communication-svc',
})

function sendReply(msg, req) {
    req.type = 'reply'
    req.msg = String(msg)
    commMgrClient.send(req, (err) => {
        if(err) u.showErr(err)
    })
}

let msKey = 'everlife-calculator-demo-svc'
/*      outcome/
 * Register ourselves as a message handler with the communication
 * manager so we can handle requests for simple calculations.
 */
function registerWithCommMgr() {
    commMgrClient.send({
        type: 'register-msg-handler',
        mskey: msKey,
        mstype: 'msg',
        mshelp: [ { cmd: '/calc', txt: 'do some math!' } ],
    }, (err) => {
        if(err) u.showErr(err)
    })
}

function startMicroservice() {

    /*      understand/
     * The calculator microservice (partitioned by key to prevent
     * conflicting with other services.
     */
    const calcSvc = new cote.Responder({
        name: 'Everlife Calculator Service Demo',
        key: msKey,
    })

    /*      outcome/
     * Respond to user messages asking us to calculate things by
     * evaluating them as an expression and returning the result if
     * found.
     */
    calcSvc.on('msg', (req, cb) => {
        if(!req.msg) return cb()

        let txt = req.msg
        if(!txt.startsWith('/calc ')) return cb()

        cb(null, true)

        txt = txt.substr('/calc '.length)

        calc(txt, (v) => {
            if(v) {
                sendReply(v, req)
            } else {
                sendReply(`Could not calculate ${txt}`, req)
            }
        })

    })

    calcSvc.on('calc', (req, cb) => {
        calc(req.expr, cb)
    })

}

function calc(txt, cb) {
    try {
        txt = txt.replace(/[^-()\d/*+.]/g, '')
        // TODO: Is there a better way instead
        // of `eval()`?
        let v = eval(txt)
        if(isNaN(v)) cb()
        else cb(v)
    } catch(e) {
        cb()
    }

}

main()


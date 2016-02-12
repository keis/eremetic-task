var got = require('got')
var Promise = require('pinkie-promise')
var EventEmitter = require('events').EventEmitter
var util = require('util')

var terminal = [
  'TASK_FINISHED',
  'TASK_FAILED',
  'TASK_ERROR'
]

function hasFinished(task) {
  var last = task.status[task.status.length - 1]
  return !!~terminal.indexOf(last.status)
}

function Task(id) {
  this.id = id
  EventEmitter.call(this)
}
util.inherits(Task, EventEmitter)

module.exports = function launch(host, task) {
  return new Promise(function (resolve, reject) {
    got.post(host + '/task', { body: JSON.stringify(task) })
      .then(function (res) {
        var loc = res.headers['location']
        if (loc == null) {
          reject(new Error("No location set in response"))
        }
        var em = new Task(JSON.parse(res.body))
        var idx = 0
        function watch() {
          got(loc)
            .then(function (res) {
              var obj = JSON.parse(res.body)
              obj.status.slice(idx).forEach(function (s) {
                em.emit('status', s)
              })
              idx = obj.status.length
              if (hasFinished(obj)) {
                em.emit('done')
              } else {
                setTimeout(watch, 1000)
              }
            })
            .catch(function (err) {
              em.emit('error', err)
            })
        }
        resolve(em)
        watch()
      })
  })
}

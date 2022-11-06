// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for examples
const Nut = require('../models/nut')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// Index
// /nuts
router.get('/nuts', (req, res, next) => {
    Nut.find()
        .then(nuts => {
            return nuts.map(nut => nut)
        })
        .then(nuts =>  {
            res.status(200).json({ nuts: nuts })
        })
        .catch(next)
})

//Show
// /nuts/:id
router.get('/nuts/:id', requireToken, (req, res, next) => {
    Nut.findById(req.params.id)
    .then(handle404)
    .then(nut => {
        res.status(200).json({ nut: nut })
    })
    .catch(next)

})

// Create
// POST /nuts
// has to have a token attached to the user (meaning they're authenticated) in order to create a nut
router.post('/nuts', requireToken, (req, res, next) => {
    req.body.nut.owner = req.user.id

    // on the front end, I have to send a nut as the top level key
    // nut: { name: '', type: '' }
    Nut.create(req.body.nut)
    .then(nut => {
        res.status(201).json({ nut: nut })
    })
    // next means to pass it to the next app.use in server.js which is errorHandler(?)
    .catch(next)
})

// Update
// /nuts/:id
router.patch('/nuts/:id', requireToken, removeBlanks, (req, res, next) => {
    delete req.body.nut.owner

    Nut.findById(req.params.id)
    .then(handle404)
    .then(nut => {
        requireOwnership(req, nut)

        return nut.updateOne(req.body.nut)
    })
    .then(() => res.sendStatus(204))
    .catch(next)

})


// Destroy
// DELETE /nuts/:id
router.delete('/nuts/:id', requireToken, (req, res, next) => {
	Nut.findById(req.params.id)
		.then(handle404)
		.then(nut => {
			requireOwnership(req, nut)
			nut.deleteOne()
		})
		.then(() => res.sendStatus(204))
		.catch(next)
})

module.exports = router
module.exports = router
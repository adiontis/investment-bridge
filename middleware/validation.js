const Joi = require('joi');

const registrationSchema = Joi.object({
email: Joi.string().email().required(),
password: Joi.string().min(8).required(),
firstName: Joi.string().min(2).max(50).required(),
lastName: Joi.string().min(2).max(50).required(),
phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional()
});

const loginSchema = Joi.object({
email: Joi.string().email().required(),
password: Joi.string().required()
});

const investmentSchema = Joi.object({
businessId: Joi.number().integer().positive().required(),
amount: Joi.number().min(5).max(100000).required()
});

function validateRegistration(req, res, next) {
const { error } = registrationSchema.validate(req.body);
if (error) {
return res.status(400).json({
error: 'Validation error',
details: error.details[0].message
});
}
next();
}

function validateLogin(req, res, next) {
const { error } = loginSchema.validate(req.body);
if (error) {
return res.status(400).json({
error: 'Validation error',
details: error.details[0].message
});
}
next();
}

function validateInvestment(req, res, next) {
const { error } = investmentSchema.validate(req.body);
if (error) {
return res.status(400).json({
error: 'Validation error',
details: error.details[0].message
});
}
next();
}

module.exports = {
validateRegistration,
validateLogin,
validateInvestment
};


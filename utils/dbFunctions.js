const {sequelize} = require('../db/index');
const pino = require('pino');
const dest = pino.destination({sync: false});
const logger = pino(dest);

module.exports.create = async (model, item, include = []) => {
    try {
        return await sequelize.transaction(async (t) => {
            const res = await model.create(item, {include: include, transaction: t});
            return res.get({plain: true});
        });
    } catch (err) {
        logger.error(err);
        return {error: err};
    }
}

module.exports.update = async (prevItem, item, include, conditions) => {
    try {
        return await sequelize.transaction(async (t) => {
            const res = await prevItem.update(item, {include: include, where: conditions, transaction: t, returning: true, plain: true});
            return res.get({plain: true});
        });
    } catch (err) {
        logger.error(err);
        return {error: err};
    }
}


module.exports.findAll = async (model, conditions, include = []) => {
    return await model.findAll({
        include: include,
        where: conditions
    });
}

module.exports.findOne = async (model, conditions, include = []) => {
    const res = await model.findAll({
        include: include,
        where: conditions
    });
    return res[0];
}

module.exports.destroy = async (item) => {
    return item.destroy();
}

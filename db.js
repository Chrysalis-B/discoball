var spicedPg = require("spiced-pg");
var db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);

module.exports.createUser = function createUser(first, last, email, password) {
    return db.query(
        `
        INSERT INTO users (first, last, email, password)
        VALUES ($1, $2, $3, $4) RETURNING id`,
        [first || null, last || null, email || null, password || null]
    );
};

module.exports.createProfile = function createProfile(age, city, url, userId) {
    return db.query(
        `INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)`,
        [age || null, city || null, url || null, userId || null]
    );
};

module.exports.signPetition = function signPetition(
    first,
    last,
    signature,
    userId
) {
    return db.query(
        `
        INSERT INTO signatures (first, last, signature, user_id)
        VALUES ($1, $2, $3, $4) RETURNING id`,
        [first || null, last || null, signature || null, userId || null]
    );
};

module.exports.deleteSig = function deleteSig(userId) {
    return db.query(
        `DELETE FROM signatures
        WHERE user_id = $1`,
        [userId]
    );
};

module.exports.getSigners = function getSigners() {
    return db.query(
        `
        SELECT first, last, user_profiles.age, user_profiles.city, user_profiles.url FROM signatures
        LEFT JOIN user_profiles
        ON signatures.user_id = user_profiles.user_id
        `
    );
};

module.exports.getSignersByCity = function getSignersByCity(city) {
    return db.query(
        `SELECT * FROM user_profiles
        LEFT JOIN users
        ON user_profiles.user_id = users.id
        WHERE LOWER(city) = LOWER($1)`,
        [city]
    );
};

module.exports.getSignatureById = function getSignatureById(sigId) {
    return db.query(`SELECT signature FROM signatures WHERE ID =$1`, [sigId]);
};

module.exports.getCount = function getCount() {
    return db.query(`SELECT COUNT(*) FROM signatures`);
};

module.exports.getUserInfo = function getUserInfo(userId) {
    return db.query(
        `SELECT * FROM user_profiles
    LEFT JOIN users
    ON user_profiles.user_id = users.id
    WHERE users.id = $1`,
        [userId]
    );
};

module.exports.updateUserProfile = function updateUserProfile(
    age,
    city,
    url,
    userId
) {
    return db.query(
        `UPDATE user_profiles
        SET age = $1, city = $2, url = $3
        WHERE user_id = $4`,
        [age || null, city, url, userId]
    );
};

module.exports.updateUserWPassword = function updateUserWPassword(
    first,
    last,
    email,
    password,
    userId
) {
    return db.query(
        `UPDATE users
        SET first = $1, last = $2, email = $3, password = $4
        WHERE id = $5`,
        [first || null, last || null, email || null, password, userId]
    );
};

module.exports.updateUser = function updateUser(first, last, email, userId) {
    return db.query(
        `UPDATE users
        SET first = $1, last = $2, email = $3
        WHERE id = $4`,
        [first || null, last || null, email || null, userId]
    );
};

module.exports.getUserByEmail = function getUserByEmail(email) {
    return db.query(
        `
        SELECT users.first, users.last, password, users.id as user_id, signatures.id as sig_id
        FROM users
        LEFT JOIN signatures
        ON signatures.user_id = users.id
        WHERE email = $1`,
        [email]
    );
};

DROP TABLE IF EXISTS users;

CREATE TABLE users(
        id SERIAL PRIMARY KEY,
        first VARCHAR(200) NOT NULL,
        last VARCHAR(250) NOT NULL,
        email VARCHAR(250) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        registered TIMESTAMP
);

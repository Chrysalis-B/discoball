const express = require("express");
const app = express();
const hb = require("express-handlebars");
const animation = require("chalk-animation");
const db = require("./db.js");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const bcrypt = require("bcryptjs");

//=======================MIDDLEWARE=====================

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(
    require("body-parser").urlencoded({
        extended: false
    })
);

app.use(require("cookie-parser")());

app.use(express.static("public"));

app.use(
    cookieSession({
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

app.use(csurf());

app.use(function(req, res, next) {
    res.setHeader("X-Frame-Options", "DENY");
    res.locals.csrfToken = req.csrfToken();
    next();
});

//======================ROUTES==========

app.get("/", requireLoggedOut, (req, res) => {
    res.redirect("/registration");
});

app.get("/registration", requireLoggedOut, (reg, res) => {
    res.render("registration", {
        layout: "main"
    });
});

app.post("/registration", (req, res) => {
    hashPassword(req.body.password)
        .then(function(hashedPassword) {
            return db.createUser(
                req.body.first,
                req.body.last,
                req.body.email,
                hashedPassword
            );
        })
        .then(function(result) {
            const userId = result.rows[0].id;
            req.session.userId = userId;
            const firstName = req.body.first;
            req.session.first = firstName;
            const lastName = req.body.last;
            req.session.last = lastName;
        })
        .then(function() {
            return res.redirect("/onboarding");
        })
        .catch(function(err) {
            res.render("registration", {
                layout: "main",
                error: "error"
            });
            console.log(err);
        });
});

app.get("/login", requireLoggedOut, (req, res) => {
    res.render("login", {
        layout: "main"
    });
});

app.post("/login", (req, res) => {
    let userId;
    let first;
    let last;
    let sigId;
    db
        .getUserByEmail(req.body.email)
        .then(function(result) {
            userId = result.rows[0].user_id;
            first = result.rows[0].first;
            last = result.rows[0].last;
            sigId = result.rows[0].sig_id;
            return checkPassword(req.body.password, result.rows[0].password);
        })
        .then(function(result) {
            if (result == false) {
                throw new Error();
            } else {
                req.session.userId = userId;
                req.session.sigId = sigId;
                req.session.first = first;
                req.session.last = last;
                res.redirect("/petition");
            }
        })
        .catch(function(err) {
            res.render("login", {
                layout: "main",
                error: "error"
            });
            console.log(err);
        });
});

app.get("/onboarding", requireUserId, requireNoSignature, (req, res) => {
    res.render("onboarding", {
        layout: "main"
    });
});

app.post("/onboarding", (req, res) => {
    db
        .createProfile(
            req.body.age,
            req.body.city,
            req.body.url,
            req.session.userId
        )
        .then(function() {
            return res.redirect("/petition");
        })
        .catch(function(err) {
            res.render("onboarding", {
                layout: "main",
                error: "error"
            });
            console.log(err);
        });
});

app.get("/petition", requireUserId, requireNoSignature, (req, res) => {
    res.render("petition", {
        layout: "main",
        first: req.session.first,
        last: req.session.last
    });
});

app.post("/petition", (req, res) => {
    db
        .signPetition(
            req.session.first,
            req.session.last,
            req.body.signature,
            req.session.userId
        )
        .then(function(result) {
            const sigId = result.rows[0].id;
            req.session.sigId = sigId;
        })
        .then(function() {
            return res.redirect("/thankyou");
        })
        .catch(function(err) {
            res.render("petition", {
                layout: "main",
                error: "error"
            });
            console.log(err);
        });
});

app.get("/thankyou", requireUserId, requireSignature, (req, res) => {
    Promise.all([db.getCount(), db.getSignatureById(req.session.sigId)])
        .then(function([countresult, sigresult]) {
            res.render("thankyou", {
                count: countresult.rows[0].count,
                signature: sigresult.rows[0].signature,
                layout: "main"
            });
        })
        .catch(function(err) {
            console.log(err);
        });
});

app.post("/thankyou", function(req, res) {
    db
        .deleteSig(req.session.userId)
        .then(function() {
            req.session.sigId = null;
            res.redirect("/petition");
        })
        .catch(function(err) {
            console.log(err);
        });
});

app.get("/edit_profile", requireUserId, requireSignature, (req, res) => {
    db
        .getUserInfo(req.session.userId)
        .then(function(result) {
            res.render("editprofile", {
                layout: "main",
                userInfo: result.rows[0]
            });
        })
        .catch(function(err) {
            console.log(err);
        });
});

app.post("/edit_profile", (req, res) => {
    if (req.body.password) {
        hashPassword(req.body.password)
            .then(function(hashedPassword) {
                Promise.all([
                    db.updateUserWPassword(
                        req.body.first,
                        req.body.last,
                        req.body.email,
                        hashedPassword,
                        req.session.userId
                    ),
                    db.updateUserProfile(
                        req.body.age,
                        req.body.city,
                        req.body.url,
                        req.session.userId
                    )
                ]);
            })
            .then(function() {
                return res.redirect("/thankyou");
            })
            .catch(function(err) {
                console.log(err);
            });
    } else {
        Promise.all([
            db.updateUser(
                req.body.first,
                req.body.last,
                req.body.email,
                req.session.userId
            ),
            db.updateUserProfile(
                req.body.age,
                req.body.city,
                req.body.url,
                req.session.userId
            )
        ])
            .then(function() {
                return res.redirect("/thankyou");
            })
            .catch(function(err) {
                console.log(err);
            });
    }
});

app.get("/signers", requireUserId, requireSignature, (req, res) => {
    db
        .getSigners()
        .then(function(result) {
            res.render("signers", {
                signers: result.rows,
                layout: "main"
            });
        })
        .catch(function(err) {
            console.log(err);
        });
});

app.get("/signers/:city", function(req, res) {
    db
        .getSignersByCity(req.params.city)
        .then(function(result) {
            res.render("signers", {
                signers: result.rows,
                layout: "main"
            });
        })
        .catch(function(err) {
            console.log(err);
        });
});

app.get("/logout", function(req, res) {
    req.session = null;
    res.redirect("/login");
});

app.get("*", function(req, res) {
    res.redirect("/");
});

app.listen(process.env.PORT || 8080, () =>
    animation.rainbow("Listening on 8080")
);

//==============FUNCTIONS=============

function hashPassword(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                console.log(err);
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    console.log(err);
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
}

function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(
            textEnteredInLoginForm,
            hashedPasswordFromDatabase,
            function(err, doesMatch) {
                if (err) {
                    reject(err);
                } else {
                    resolve(doesMatch);
                }
            }
        );
    });
}

function requireNoSignature(req, res, next) {
    if (req.session.sigId) {
        return res.redirect("/thankyou");
    } else {
        next();
    }
}

function requireSignature(req, res, next) {
    if (!req.session.sigId) {
        return res.redirect("/petition");
    } else {
        next();
    }
}

function requireUserId(req, res, next) {
    if (!req.session.userId) {
        res.redirect("/register");
    } else {
        next();
    }
}

function requireLoggedOut(req, res, next) {
    if (req.session.userId) {
        res.redirect("/petition");
    } else {
        next();
    }
}

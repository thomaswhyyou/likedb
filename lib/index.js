"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sanitize_1 = require("./src/sanitize");
const store_1 = require("./src/store");
const DEFAULT_OFFSET = 0;
const DEFAULT_LIMIT = 10;
class LikeDB {
    constructor(options) {
        this.options = options || {};
        this.store = store_1.default(this.options);
    }
    add(options) {
        return this.store.add(sanitize_1.default({
            url: options.url,
            title: options.title || "",
            tags: options.tags || [],
            createdAt: options.createdAt || Date.now(),
            updatedAt: Date.now()
        }));
    }
    count() {
        return this.store.count();
    }
    delete(url) {
        return this.store.delete(url);
    }
    get(url) {
        return this.store.get(url);
    }
    listByTag(tag, options) {
        const result = [];
        const limit = options && options.limit ? options.limit : 25;
        return new Promise((resolve, reject) => {
            this.store.select("tags", { only: tag }, (err, row) => {
                if (err)
                    return reject(err);
                if (!row || result.length >= limit) {
                    return resolve(result.sort(sortByCreatedAt));
                }
                result.push(row.value);
                row.continue();
            });
        });
    }
    recent(limit) {
        const result = [];
        return new Promise((resolve, reject) => {
            this.store.select("createdAt", null, "prev", (err, row) => {
                if (err)
                    return reject(err);
                if (!row || result.length >= limit) {
                    return resolve(result.sort(sortByCreatedAt));
                }
                result.push(row.value);
                row.continue();
            });
        });
    }
    search(index, keyword, options) {
        const result = [];
        const offset = options && options.offset ? options.offset : DEFAULT_OFFSET;
        const limit = options && options.limit ? options.limit : DEFAULT_LIMIT;
        let i = 0;
        return new Promise((resolve, reject) => {
            this.store.select(index, { from: keyword, to: keyword + "\uffff" }, "prev", (err, row) => {
                if (err)
                    return reject(err);
                if (!row || result.length >= limit)
                    return resolve(result.sort(sortByCreatedAt));
                if (i++ >= offset) {
                    result.push(row.value);
                }
                row.continue();
            });
        });
    }
    searchByTags(keyword, options) {
        return this.search("tags", keyword, options || {});
    }
    searchByTitle(keyword, options) {
        return this.search("cleanTitle", keyword, options || {});
    }
    searchByUrl(keyword, options) {
        return this.search("cleanUrl", keyword, options || {});
    }
    untag(url, tag) {
        return this.store.get(url).then((row) => {
            const index = row.tags ? row.tags.indexOf(tag) : -1;
            if (index === -1) {
                throw new Error("Tag doesn't exist");
            }
            row.tags.splice(index, 1);
            row.updatedAt = Date.now();
            return this.store.update(row);
        });
    }
    updateTitle(url, title) {
        return this.store.get(url).then((row) => {
            row.title = title;
            row.updatedAt = Date.now();
            return this.store.update(sanitize_1.default(row));
        });
    }
    tag(url, tag) {
        return this.store.get(url).then((row) => {
            if (!row.tags) {
                row.tags = [tag];
                row.updatedAt = Date.now();
                return this.store.update(row);
            }
            if (row.tags.indexOf(tag) > -1) {
                throw new Error("Tag already added");
            }
            row.tags.push(tag);
            row.updatedAt = Date.now();
            return this.store.update(row);
        });
    }
    deleteDB() {
        return this.store.db.delete();
    }
}
exports.default = LikeDB;
function sortByCreatedAt(a, b) {
    if (a.createdAt > b.createdAt) {
        return -1;
    }
    if (a.createdAt < b.createdAt) {
        return 1;
    }
    return 0;
}
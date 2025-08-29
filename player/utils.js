const logger = {
    info: (...args) => console.info('[Tape Operator Player]', ...args),
    warn: (...args) => console.warn('[Tape Operator Player]', ...args),
    error: (...args) => console.error('[Tape Operator Player]', ...args)
};

function hashCode(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function setSearchParam(key, value) {
    const url = new URL(location.href);
    url.searchParams.set(key, value);
    history.replaceState(null, '', url.toString());
}

function getSearchParam(key) {
    const url = new URL(location.href);
    return url.searchParams.get(key);
}

function parseVersion(version) {
    return parseInt(version.replace(/\D/g, ''));
}

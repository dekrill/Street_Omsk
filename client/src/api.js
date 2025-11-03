class Api {
    constructor() {
        this.url = window.location.origin;
    }

    async post(endpoint, data) {
        const response = await fetch(this.url + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response;
    }
}

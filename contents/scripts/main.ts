
import * as bs58 from 'bs58'
import * as steem from 'steem/dist/steem.min'

type AssetSymbol = 'STEEM'|'VESTS'

class Asset {
    constructor(public readonly amount: number, public readonly symbol: AssetSymbol) {}
    toString() {
        switch (this.symbol) {
            case 'STEEM':
                return `${ this.amount.toFixed(3) } STEEM`
            case 'VESTS':
                return `${ this.amount.toFixed(6) } VESTS`
        }
    }
}

interface CreateAccountOptions {
    creator: string
    fee: Asset
    username: string
    password: string
    metadata: {[key: string]: any}
}

async function createAccount(options: CreateAccountOptions, wif: string) {
    return new Promise<any>((resolve, reject) => {
        const keys = steem.auth.generateKeys(options.username, options.password, ['owner', 'active', 'posting', 'memo'])
        const owner = {weight_threshold: 1, account_auths: [], key_auths: [[keys.owner, 1]]}
        const active = {weight_threshold: 1, account_auths: [], key_auths: [[keys.active, 1]]}
        const posting = {weight_threshold: 1, account_auths: [], key_auths: [[keys.posting, 1]]}
        const callback = (error, result) => {
            if (error) {
                const parts = error.message.split('\n') as string[]
                if (parts.length > 1) {
                    error.message = parts[1]
                }
                reject(error)
            } else { resolve(result) }
        }
        steem.broadcast.accountCreate(
            wif, options.fee.toString(), options.creator, options.username, owner,
            active, posting, keys.memo, JSON.stringify(options.metadata), callback
        )
    })
}

export default async function main() {
    const container = document.getElementById('container')
    const status = document.getElementById('status')

    const form = document.getElementById('create-account') as HTMLFormElement
    const creator = document.getElementById('creator') as HTMLInputElement
    const wif = document.getElementById('wif') as HTMLInputElement
    const username = document.getElementById('username') as HTMLInputElement
    const password = document.getElementById('password') as HTMLInputElement
    const passwordRepeat = document.getElementById('password-repeat') as HTMLInputElement
    const button = form.querySelector('input[type=submit]') as HTMLInputElement

    document.querySelector('a[href="#generate-password"]').addEventListener('click', (event) => {
        event.preventDefault()
        let buffer = new Buffer(40)
        window.crypto.getRandomValues(buffer)
        password.value = bs58.encode(buffer)
    })

    const inputs = [creator, wif, username, password, passwordRepeat, button]

    const create = async () => {
        if (password.value.length < 6) {
            throw new Error('Invalid password')
        }
        if (password.value !== passwordRepeat.value) {
            throw new Error('Passwords do not match')
        }
        const options: CreateAccountOptions = {
            creator: creator.value,
            fee: new Asset(6, 'STEEM'),
            username: username.value,
            password: password.value,
            metadata: {created_by: `Steem account creator - ${ document.location.href }`}
        }
        await createAccount(options, wif.value)
    }

    form.onsubmit = (event) => {
        event.preventDefault()
        container.classList.remove('error')
        container.classList.add('working')
        status.innerHTML = 'Creating account...'
        for (const input of inputs) {
            input.disabled = true
        }
        const done = () => {
            container.classList.remove('working')
            for (const input of inputs) {
                input.disabled = false
            }
        }
        create().then(() => {
            done()
            status.innerHTML = 'Account created!'
        }).catch((error: Error) => {
            done()
            container.classList.add('error')
            status.innerHTML = `
                Could not create account:
                <span class="message">${ error.message }</span>
            `
        })
    }
}

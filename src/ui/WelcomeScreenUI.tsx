import { observer } from 'mobx-react-lite'
import { useSt } from './stContext'

export const WelcomeScreenUI = observer(function WelcomeScreenUI_(p: {}) {
    const client = useSt()
    return (
        <div className='welcome-screen'>
            <div className='welcome-popup col gap items-center'>
                <h1>Comfy IDE</h1>
                <div className='row items-baseline gap'>
                    <div style={{ width: '3rem', textAlign: 'right' }}>IP:</div>
                    <input
                        type='text'
                        value={client.serverIP}
                        onChange={(ev) => {
                            client.serverIP = ev.target.value
                        }}
                    />
                </div>
                <div className='row items-baseline gap'>
                    <div style={{ width: '3rem', textAlign: 'right' }}>Port:</div>
                    <input
                        type='text'
                        value={client.serverPort}
                        onChange={(ev) => {
                            client.serverPort = parseInt(ev.target.value, 10)
                        }}
                    />
                </div>
                <button className='primary large self-stretch' onClick={() => client.fetchObjectsSchema()}>
                    Connect
                </button>
                {/* <button className='primary large self-stretch' onClick={() => client.connect()}>
                    Connect Test
                </button> */}
            </div>
        </div>
    )
})

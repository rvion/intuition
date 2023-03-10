import type { NodeProgress } from './ComfyAPI'
import type { ComfyGraph } from './ComfyGraph'
import type { ComfyNodeJSON } from './ComfyPrompt'

import { configure, extendObservable, makeAutoObservable } from 'mobx'
import { ComfyNodeOutput } from './ComfyNodeOutput'
import { ComfyNodeSchema, NodeInputExt } from './ComfySchema'
import { ITreeNode } from './tree'
import { ComfyNodeUI } from '../ui/NodeListUI'

configure({ enforceActions: 'never' })

/** ComfyNode
 * - correspond to a signal in the graph
 * - belongs to a script
 */
export class ComfyNode<ComfyNode_input extends object> {
    artifacts: { images: string[] }[] = []
    progress: NodeProgress | null = null
    $schema: ComfyNodeSchema

    get inputs(): ComfyNode_input {
        return this.json.inputs as any
    }

    get treeData(): ITreeNode {
        return {
            name: 'node',
            type: 'node',
            // children: [],
            tooltip: <ComfyNodeUI node={this} />,
        }
    }

    json: ComfyNodeJSON

    /** update a node */
    set(p: Partial<ComfyNode_input>) {
        for (const [key, value] of Object.entries(p)) {
            this.json.inputs[key] = this.serializeValue(key, value)
        }
        // Object.assign(this.json.inputs, p)
    }

    constructor(
        //
        public graph: ComfyGraph,
        public uid: string = graph.getUID(),
        xxx: ComfyNodeJSON,
    ) {
        // console.log('CONSTRUCTING', xxx.class_type, uid)
        this.$schema = graph.schema.nodesByName[xxx.class_type]
        let ix = 0
        this.json = this._convertPromptExtToPrompt(xxx)
        this.graph.nodes.set(this.uid.toString(), this)
        makeAutoObservable(this)
        const extensions: { [key: string]: any } = {}
        for (const x of this.$schema.outputs) {
            extensions[x.name] = new ComfyNodeOutput(this, ix++, x.name)
            // console.log(`  - .${x.name} as ComfyNodeOutput(${ix})`)
        }
        extendObservable(this, extensions)
        // console.log(Object.keys(Object.getOwnPropertyDescriptors(this)).join(','))
        // makeObservable(this, { artifacts: observable })
    }

    _convertPromptExtToPrompt(promptExt: ComfyNodeJSON) {
        const inputsExt = Object.entries(promptExt.inputs)
        const inputs: { [inputName: string]: any } = {}
        for (const [name, value] of inputsExt) {
            inputs[name] = this.serializeValue(name, value)
        }
        return { class_type: this.$schema.name, inputs }
    }

    get manager() { return this.graph.client } // prettier-ignore

    artifactsForStep(step: number): string[] {
        return this.artifacts[step]?.images.map((i) => `http://${this.manager.serverHost}/view/${i}`) ?? []
    }

    get allArtifactsImgs(): string[] {
        return this.artifacts //
            .flatMap((a) => a.images)
            .map((i) => `http://${this.manager.serverHost}/view/${i}`)
    }

    async get() {
        await this.graph.get()
    }

    serializeValue(field: string, value: unknown): unknown {
        if (value == null) throw new Error('???? null ??')
        if (value instanceof ComfyNodeOutput) return [value.node.uid, value.slotIx]
        if (value instanceof ComfyNode) {
            // console.log('???? Value is COmfyNode??')
            const expectedType = this._getExpecteTypeForField(field)
            const output = value._getOutputForType(expectedType)
            return [value.uid, output.slotIx]
        }
        return value
    }

    private _getExpecteTypeForField(name: string): string {
        // console.log('>>name', name)
        const input = this.$schema.inputs.find((i: NodeInputExt) => i.name === name)
        // console.log('>>name', name, input)
        if (input == null) throw new Error('???? input not found asdf')
        return input.type
    }

    private _getOutputForType(type: string): ComfyNodeOutput<any> {
        const i: NodeInputExt = this.$schema.outputs.find((i: NodeInputExt) => i.type === type)!
        const val = (this as any)[i.name]
        // console.log(`this[i.name] = ${this.$schema.name}[${i.name}] = ${val}`)
        if (val instanceof ComfyNodeOutput) return val
        throw new Error(`Expected ${i.name} to be a NodeOutput`)
    }
}

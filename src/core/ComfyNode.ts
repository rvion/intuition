import type { NodeProgress } from './ComfyAPI'
import type { ComfyGraph } from './ComfyGraph'
import type { ComfyNodeJSON } from './ComfyNodeJSON'
import type { ComfyNodeSchema, NodeInput } from './ComfyNodeSchema'

import { makeObservable, observable } from 'mobx'
import { ComfyNodeOutput } from './ComfyNodeOutput'

/** ComfyNode
 * - correspond to a signal in the graph
 * - belongs to a script
 */
export abstract class ComfyNode<ComfyNode_input extends object> {
    artifacts: { images: string[] }[] = []
    progress: NodeProgress | null = null
    abstract $schema: ComfyNodeSchema
    get manager() { return this.script.manager } // prettier-ignore

    artifactsForStep(step: number): string[] {
        return this.artifacts[step]?.images.map((i) => `http://${this.manager.serverHost}/view/${i}`) ?? []
    }

    get allArtifactsImgs(): string[] {
        return this.artifacts //
            .flatMap((a) => a.images)
            .map((i) => `http://${this.manager.serverHost}/view/${i}`)
    }

    async get() {
        await this.script.get()
    }

    constructor(
        //
        public script: ComfyGraph,
        public uid: string = script.getUID(),
        public inputs: ComfyNode_input,
    ) {
        this.script.nodes.set(this.uid.toString(), this)
        makeObservable(this, { artifacts: observable })
    }

    toJSON(): ComfyNodeJSON {
        const out: { [key: string]: any } = {}
        for (const [name, val] of Object.entries(this.inputs)) {
            out[name] = this.serializeValue(name, val)
        }
        return {
            inputs: out,
            class_type: this.$schema.type,
        }
    }

    getExpecteTypeForField(name: string): string {
        return this.$schema.input.find((i: NodeInput) => i.name === name)!.type
    }

    getOutputForType(type: string): ComfyNodeOutput<any> {
        const i: NodeInput = this.$schema.outputs.find((i: NodeInput) => i.type === type)!
        const val = (this as any)[i.name]
        if (val instanceof ComfyNodeOutput) return val
        throw new Error(`Expected ${i.name} to be a NodeOutput`)
    }

    serializeValue(field: string, value: unknown): unknown {
        if (value instanceof ComfyNodeOutput) return [value.node.uid, value.slotIx]
        if (value instanceof ComfyNode) {
            const expectedType = this.getExpecteTypeForField(field)
            const output = value.getOutputForType(expectedType)
            return [value.uid, output.slotIx]
        }
        return value
    }
}

// const out: ApiPromptInput = {
//     client_id: 'dd78de15f4fb45d29166925ed85b44c0',
//     extra_data: { extra_pnginfo: { it: 'works' } },
//     prompt: this.comfy.toJSON(),
// }
// const res = await fetch('http://192.168.1.19:8188/prompt', {
//     method: 'POST',
//     body: JSON.stringify(out),
// })

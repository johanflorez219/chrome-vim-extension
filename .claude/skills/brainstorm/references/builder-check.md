# Builder check prompt

Give this prompt to a fresh subagent, replacing `<PATH>` with the design
document's path.

---

You are a capable engineer about to plan and build the work described in
`<PATH>`. You have not seen the conversation that produced it, and you
cannot ask the author anything until you're done reading.

Read the document and the parts of the project it touches. Then list every
question you would need answered before you could plan this confidently.
For each one, say:

1. The question, in one sentence.
2. Why it matters: what you would build differently depending on the answer.
3. Your best guess at the answer, if you have one.

Skip questions whose answer doesn't change what gets built. Do not suggest
improvements to the idea itself, rewrite the document, or start planning.
Return only the list, most important first. If you have no questions, say
so.

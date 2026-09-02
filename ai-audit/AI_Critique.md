# AI Critique (250 words)

Across the three APIs the AI was a fast but literal collaborator, and its failures
clustered in three predictable places. First, it was **assertion-biased toward
presence**: for the SEC-01 secret-leak risk it happily checked that `password` *existed*
in the response rather than writing a deny-list proving secrets are *absent*. Testing
what should not happen is cognitively harder than confirming what does, and the model
took the easy direction. Second, it **stayed inside each prompt's endpoint boundary**.
Asked to test `PUT /api/users/me`, it verified that the `role` field flipped, but never
followed the exploit to its consequence — using the escalated token against an admin
route — and it missed cross-endpoint IDOR entirely, because those bugs live on sibling
endpoints the prompt never mentioned. Third, it **imported conventional assumptions**:
it treated PUT as a partial update (so it missed that the server nulls omitted fields)
and stated an invalid token returns 401 when the SUT returns 403.

Why did it fail? The model reasons from patterns in its training distribution, not from
the running system; without executing against the live SUT it defaults to how APIs
*usually* behave. It also optimizes for plausible breadth, not adversarial depth, so
attack chains and negative-space assertions need explicit prompting.

The principle I learned: **AI multiplies breadth; humans own adversarial and
cross-cutting reasoning, and verification must run against the real system.** The staged
pipeline plus a live SUT turned the model from a black box into a disciplined assistant
whose every claim I could check — and correct.

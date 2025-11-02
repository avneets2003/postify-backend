const crypto = require("crypto");
const fetch = require("node-fetch");

function parseSignatureHeader(header) {
	const parts = {};
	header.split(",").forEach((part) => {
		const [key, value] = part.trim().split("=");
		parts[key] = value.replace(/^"|"$/g, "");
	});
	return parts;
}

async function verifySignatureHeader(req) {
	const signatureHeader = req.headers.signature;
	if (!signatureHeader) throw new Error("Missing Signature header");

	const signature = parseSignatureHeader(signatureHeader);
	const actorUrl = signature.keyId.split("#")[0];

	const actorRes = await fetch(actorUrl, {
		headers: { Accept: "application/activity+json" },
	});
	const actor = await actorRes.json();
	const publicKeyPem = actor?.publicKey?.publicKeyPem;
	if (!publicKeyPem) throw new Error("Missing public key");

	const headersToVerify = signature.headers.split(" ");
	const signedString = headersToVerify
		.map((header) => {
			if (header === "(request-target)") {
				return `(request-target): ${req.method.toLowerCase()} ${req.originalUrl}`;
			}
			return `${header}: ${req.headers[header.toLowerCase()]}`;
		})
		.join("\n");

	const verifier = crypto.createVerify("sha256");
	verifier.update(signedString);
	verifier.end();

	const isValid = verifier.verify(publicKeyPem, signature.signature, "base64");
	if (!isValid) throw new Error("Invalid signature");

	return actor;
}

module.exports = verifySignatureHeader;

const crypto = require("crypto");

function createSignatureHeader({
	actorId,
	privateKeyPem,
	requestTarget,
	host,
	date,
	digest,
}) {
	const headersToSign = [
		`(request-target): ${requestTarget}`,
		`host: ${host}`,
		`date: ${date}`,
		`digest: ${digest}`,
	];

	const signingString = headersToSign.join("\n");

	const signer = crypto.createSign("RSA-SHA256");
	signer.update(signingString);
	signer.end();

	const signature = signer.sign(privateKeyPem, "base64");

	return `keyId="${actorId}#main-key",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`;
}

module.exports = createSignatureHeader;

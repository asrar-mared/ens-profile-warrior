import packet from 'dns-packet';
import { execute, artifacts } from '@rocketh';
import type { Hex } from 'viem';

const realAnchors = [
  {
    name: '.',
    type: 'DS',
    class: 'IN',
    ttl: 3600,
    data: {
      keyTag: 19036,
      algorithm: 8,
      digestType: 2,
      digest: new Buffer(
        '49AAC11D7B6F6446702E54A1607371607A1A41855200FD2CE1CDDE32F24E8FB5',
        'hex',
      ),
    },
  },
  {
    name: '.',
    type: 'DS',
    klass: 'IN',
    ttl: 3600,
    data: {
      keyTag: 20326,
      algorithm: 8,
      digestType: 2,
      digest: new Buffer(
        'E06D44B80B8F1D39A95C0B0D7C65D08458E880409BBC683457104237C7F8EC8D',
        'hex',
      ),
    },
  },
];

const dummyAnchor = {
  name: '.',
  type: 'DS',
  class: 'IN',
  ttl: 3600,
  data: {
    keyTag: 1278, // Empty body, flags == 0x0101, algorithm = 253, body = 0x0000
    algorithm: 253,
    digestType: 253,
    digest: new Buffer('', 'hex'),
  },
};

function encodeAnchors(anchors: any[]): Hex {
  return `0x${anchors
    .map((anchor) => {
      return packet.answer.encode(anchor).toString('hex');
    })
    .join('')}`;
}

export default execute(
  async ({ deploy, get, read, execute, namedAccounts, network }) => {
    const { deployer } = namedAccounts;

    const anchors = realAnchors.slice();
    let algorithms: Record<number, string> = {
      5: 'RSASHA1Algorithm',
      7: 'RSASHA1Algorithm',
      8: 'RSASHA256Algorithm',
      13: 'P256SHA256Algorithm',
    };
    const digests: Record<number, string> = {
      1: 'SHA1Digest',
      2: 'SHA256Digest',
    };

    if (network.tags?.test) {
      anchors.push(dummyAnchor);
      algorithms[253] = 'DummyAlgorithm';
      algorithms[254] = 'DummyAlgorithm';
      digests[253] = 'DummyDigest';
    }

    const dnssec = await deploy('DNSSECImpl', {
      account: deployer,
      artifact: artifacts.DNSSECImpl,
      args: [encodeAnchors(anchors)],
    });

    if (!dnssec.newlyDeployed) {
      return;
    }

    console.log('DNSSECImpl deployed successfully');

    const transactionPromises: Promise<any>[] = [];

    // Set algorithms
    for (const [id, alg] of Object.entries(algorithms)) {
      const deployedAlgorithm = await get(alg);
      const currentAlgorithmAddress = await read(dnssec, {
        functionName: 'algorithms',
        args: [parseInt(id)],
      });

      if (deployedAlgorithm.address !== currentAlgorithmAddress) {
        const txPromise = execute(dnssec, {
          functionName: 'setAlgorithm',
          args: [parseInt(id), deployedAlgorithm.address],
          account: deployer,
        });
        transactionPromises.push(txPromise);
        console.log(`Queued algorithm ${id} to ${alg}`);
      }
    }

    // Set digests
    for (const [id, digest] of Object.entries(digests)) {
      const deployedDigest = await get(digest);
      const currentDigestAddress = await read(dnssec, {
        functionName: 'digests',
        args: [parseInt(id)],
      });

      if (deployedDigest.address !== currentDigestAddress) {
        const txPromise = execute(dnssec, {
          functionName: 'setDigest',
          args: [parseInt(id), deployedDigest.address],
          account: deployer,
        });
        transactionPromises.push(txPromise);
        console.log(`Queued digest ${id} to ${digest}`);
      }
    }

    if (transactionPromises.length > 0) {
      console.log(
        `Waiting on ${transactionPromises.length} transactions setting DNSSEC parameters`,
      );
      await Promise.all(transactionPromises);
    }

    console.log('DNSSEC oracle configuration completed');
  },
  {
    tags: ['dnssec-oracle'],
    dependencies: ['dnssec-algorithms', 'dnssec-digests'],
  }
);

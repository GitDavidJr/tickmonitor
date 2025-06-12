// @ts-expect-error
import * as snmp from 'net-snmp';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log("GET /api/snmp chamado");

  const session = snmp.createSession("192.168.89.1", "public");
  const oids = [
    "1.3.6.1.2.1.2.2.1.10.4",  // input
    "1.3.6.1.2.1.2.2.1.16.4",  // output
  ];

  try {
    const result = await new Promise<{ input: number; output: number }>((resolve, reject) => {
      session.get(oids, (error: any, varbinds: any[]) => {
        session.close();
        if (error) return reject(error);
        const input = varbinds[0].value as number;
        const output = varbinds[1].value as number;
        resolve({ input, output });
      });
    });

    const datetime = new Date().toISOString().slice(0, 19);

    console.log("result", result);

    return NextResponse.json({
      datetime,
      ...result,
    });
  } catch (err) {
    console.error("Erro SNMP:", err);
    return NextResponse.json({ error: "Erro ao consultar SNMP." }, { status: 500 });
  }
}

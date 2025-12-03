import { NextResponse } from "next/server"; 

export async function GET(){
    return NextResponse.json({
        cpu: "30%",
        memory:"2.1GB",
        status: "Healthy"
    });
}
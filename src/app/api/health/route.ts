import {NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';

export async function GET(){
    try{
        const db = await connectToDatabase();
        await db.command({ping:1});
        return NextResponse.json({ok:true,message: 'MongoDB connection OK'});
    } catch(err:any){
        return NextResponse.json({ok:false,error:err?.message ?? String(err) },{status: 500});
    }
}
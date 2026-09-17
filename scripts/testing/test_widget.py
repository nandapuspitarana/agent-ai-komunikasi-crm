import asyncio
import httpx
import json

async def test_widget():
    print("Testing /api/widget/message in Next.js...")
    async with httpx.AsyncClient(timeout=120.0) as client:
        payload = {
            "tenantId": "c5a0134a-9e19-482a-bc9e-64d8583afc3a", # I don't know the tenant ID actually. 
            # Need to fetch a valid tenantId from prisma first.
            "message": "i need meeting room"
        }
        # Actually I can't guess tenantId easily. 
        # Better to query it using prisma or test proxy directly.
        pass

if __name__ == "__main__":
    asyncio.run(test_widget())

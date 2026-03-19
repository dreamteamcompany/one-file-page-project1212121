import json
import os
import sys
import base64
import uuid
import boto3

def log(msg):
    print(msg, file=sys.stderr, flush=True)


def handler(event, context):
    '''Загрузка файлов (фото) в S3-хранилище'''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    cors = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    
    if method != 'POST':
        return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}
    
    try:
        body = json.loads(event.get('body', '{}'))
        file_data = body.get('file')
        filename = body.get('filename', 'photo.jpg')
        
        if not file_data:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'No file data'})}
        
        file_bytes = base64.b64decode(file_data)
        
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
        allowed_ext = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
        if ext not in allowed_ext:
            ext = 'jpg'
        
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        s3_key = f"uploads/photos/{unique_name}"
        
        content_types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml'
        }
        content_type = content_types.get(ext, 'image/jpeg')
        
        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        
        s3.put_object(
            Bucket='files',
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type
        )
        
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{s3_key}"
        
        log(f"File uploaded: {s3_key}, size: {len(file_bytes)} bytes")
        
        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({'url': cdn_url, 'key': s3_key})
        }
    
    except Exception as e:
        log(f"Upload error: {str(e)}")
        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': str(e)})}
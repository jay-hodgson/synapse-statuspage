# synapse-statuspage
Updates statuspage.io with the current Synapse application status.  Packaged as an AWS Lambda function.

Note: used [node-lambda](https://github.com/motdotla/node-lambda) as a starting point.
## How to create the deployment package
To create a zipped package for Amazon Lambda deployment:
```
node-lambda package -n synapse-statuspage -e production
```
## [How to deploy the AWS Lambda Function deployment package](http://docs.aws.amazon.com/lambda/latest/dg/vpc-rds-upload-deployment-pkg.html)
```
## <bucket_name> is the name of the bucket where the package resides
## <lambda_role_arn> is the arn of the role to be assumed by the lambda function
aws lambda create-function --region <region> --function-name synapse-statuspage --code S3Bucket=<bucket_name>,S3Key=synapse-statuspage-production.zip --role <lambda_role_arn> --handler index.handler --runtime nodejs8.10 --timeout 3 --memory-size 128
```

To update the function:
```
aws lambda update-function-code --function-name synapse-statuspage --s3-bucket <bucket_name> --s3-key=synapse-statuspage-production.zip --publish
```
## How to test locally
Use the following command to run your Amazon Lambda index.js file locally. It passes event.json data to the Amazon Lambda event object, and uses env variables defined in deploy.env:
```
node-lambda run -f deploy.env
```

## Statuspage.io API key
The key should be available in the deployment configuration (env variables), with key `STATUS_PAGE_IO_API_KEY`.

In local testing, I set this key/value in deploy.env (which is in .gitignore, so not checked into version control).

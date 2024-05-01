import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'Github-Test-Stack');

// Define the GitHub source action
const sourceOutput = new codepipeline.Artifact();
const sourceAction = new codepipelineActions.GitHubSourceAction({
    actionName: 'GitHub_Source',
    owner: 'kengelgon',
    repo: 'code-pipeline-test', // Replace with your repository name
    branch: 'main',
    oauthToken: cdk.SecretValue.secretsManager('github-oauth'),
    output: sourceOutput,
});

// Define the CodeBuild build action
const buildProject = new codebuild.PipelineProject(stack, 'MyBuildProject', {
    // Define your build project configuration
    projectName: 'test-app',
    buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
            build: {
                commands: [
                    'npm install -g @angular/cli',
                    'npm install',
                    'ng build'
                ],
            },
        }
    }),
});

const buildAction = new codepipelineActions.CodeBuildAction({
    actionName: 'CodeBuild',
    project: buildProject,
    input: sourceOutput,
    outputs: [/* Specify any additional outputs if needed */],
});

// Define the CodePipeline
const pipeline = new codepipeline.Pipeline(stack, 'MyPipeline', {
    pipelineName: 'MyPipeline',
    stages: [
        {
            stageName: 'Source',
            actions: [sourceAction],
        },
        {
            stageName: 'Build',
            actions: [buildAction],
        },
        // Add more stages as needed
    ],
});

// Grant necessary permissions to the pipeline
pipeline.addToRolePolicy(new iam.PolicyStatement({
    actions: ['codebuild:StartBuild'],
    resources: [buildProject.projectArn],
}));

// Create an event rule to trigger the pipeline on GitHub repository updates
const eventRule = new events.Rule(stack, 'GitHubEventRule', {
    eventPattern: {
        source: ['aws.codecommit'],
        detailType: ['CodeCommit Repository State Change'],
        detail: {
            event: ['referenceCreated', 'referenceUpdated'],
            referenceType: ['branch'],
            referenceName: ['your-github-branch'],
        },
    },
});

eventRule.addTarget(new targets.CodePipeline(pipeline));

app.synth();

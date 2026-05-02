export function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Zero-BPM Custom Engine API',
      version: '1.0.0',
      description: [
        'OpenAPI surface for the Zero-BPM custom BPM engine.',
        '',
        'Important:',
        '- Endpoints under `/api/engine/...` are the API-first custom engine surface exposed by the dashboard runtime.',
        '- Operational endpoints under `/api/...` are also available for deployment, contracts, and administrative actions.',
        '- The Swagger UI documents how SSD/low-code applications can trigger processes, work with tasks, send signals, and inspect runtime state.'
      ].join('\n')
    },
    servers: [
      { url: baseUrl, description: 'Current Zero-BPM dashboard host' }
    ],
    tags: [
      { name: 'Custom Engine', description: 'API-first custom engine contract for process execution, tasks, signals, and runtime inspection.' },
      { name: 'Operations', description: 'Implemented dashboard-backed APIs for deployment, contracts, tasks, and instance control.' }
    ],
    paths: {
      '/api/engine/processes/{processName}/start': {
        post: {
          tags: ['Custom Engine'],
          summary: 'Start a process instance',
          description: [
            'API-first process execution endpoint.',
            '',
            'Use this endpoint when an SSD app, external API gateway, automation worker, or low-code service needs to trigger a modeled process.',
            '',
            'Normalized inbound request context:',
            '- `$.data` for request body payload',
            '- `$.headers` for request headers',
            '- `$.query` for query parameters',
            '- `$.params` for path parameters',
            '- `$` for the whole inbound context object',
            '',
            'Response behavior:',
            '- Start Event `outboundMapping` defines an immediate acknowledgement response.',
            '- End Event `outputMapping` defines the final business response when the process completes synchronously.',
            '- For long-running or human-task flows, return an acknowledgement plus `instanceId`, then inspect the instance or tasks APIs.'
          ].join('\n'),
          parameters: [
            { name: 'processName', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StartProcessRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Process response or immediate start acknowledgement',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/EngineStartResponse' }
                }
              }
            }
          }
        }
      },
      '/api/engine/processes/instances': {
        get: {
          tags: ['Custom Engine'],
          summary: 'List process instances',
          responses: {
            '200': {
              description: 'List of process instances',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/EngineProcessInstance' }
                  }
                }
              }
            }
          }
        }
      },
      '/api/engine/processes/instances/{instanceId}': {
        get: {
          tags: ['Custom Engine'],
          summary: 'Get process instance detail',
          parameters: [
            { name: 'instanceId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Detailed process instance information',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/EngineProcessInstanceDetail' }
                }
              }
            }
          }
        }
      },
      '/api/engine/processes/instances/{instanceId}/abort': {
        post: {
          tags: ['Custom Engine'],
          summary: 'Abort a running process instance',
          parameters: [
            { name: 'instanceId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Abort request accepted',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' }
                }
              }
            }
          }
        }
      },
      '/api/engine/processes/instances/{instanceId}/signals': {
        post: {
          tags: ['Custom Engine'],
          summary: 'Send a signal or message to a running instance',
          parameters: [
            { name: 'instanceId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SignalRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Signal accepted',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/EngineMutationResponse' }
                }
              }
            }
          }
        }
      },
      '/api/engine/tasks': {
        get: {
          tags: ['Custom Engine'],
          summary: 'List human tasks',
          parameters: [
            { name: 'assignee', in: 'query', schema: { type: 'string' } },
            { name: 'group', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'List of tasks',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/EngineHumanTask' }
                  }
                }
              }
            }
          }
        }
      },
      '/api/engine/tasks/{taskId}/claim': {
        post: {
          tags: ['Custom Engine'],
          summary: 'Claim a task',
          parameters: [
            { name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' }
                  },
                  required: ['username']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Task claimed',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } }
            }
          }
        }
      },
      '/api/engine/tasks/{taskId}/complete': {
        post: {
          tags: ['Custom Engine'],
          summary: 'Complete a human task',
          parameters: [
            { name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CompleteTaskRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Task completed',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/EngineMutationResponse' } } }
            }
          }
        }
      },
      '/api/engine/tasks/{taskId}/reassign': {
        post: {
          tags: ['Custom Engine'],
          summary: 'Reassign a task',
          parameters: [
            { name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    assignee: { type: 'string' }
                  },
                  required: ['assignee']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Task reassigned',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } }
            }
          }
        }
      },
      '/api/assets/contract/{name}': {
        get: {
          tags: ['Operations'],
          summary: 'Get an asset contract',
          parameters: [
            { name: 'name', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Resolved asset contract',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AssetContractResponse' }
                }
              }
            }
          }
        }
      },
      '/api/deploy': {
        post: {
          tags: ['Operations'],
          summary: 'Deploy or release a modeled BPMN asset',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeployRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Release successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' }
                }
              }
            }
          }
        }
      },
      '/api/tasks/claim': {
        post: {
          tags: ['Operations'],
          summary: 'Claim a task for the current session user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { taskId: { type: 'integer' } },
                  required: ['taskId']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Task claimed',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } }
            }
          }
        }
      },
      '/api/tasks/{id}/reassign': {
        post: {
          tags: ['Operations'],
          summary: 'Administrative task reassignment',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { assignee: { type: 'string' } },
                  required: ['assignee']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Task reassigned',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } }
            }
          }
        }
      },
      '/api/instances/{id}/abort': {
        post: {
          tags: ['Operations'],
          summary: 'Administrative instance abort',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Instance aborted',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        StartProcessRequest: {
          type: 'object',
          example: {
            data: {
              customerId: 'C-1001',
              amount: 4500,
              orderId: 'ORD-9001'
            },
            headers: {
              authorization: 'Bearer <token>',
              'x-request-id': 'req-100'
            },
            query: {
              preview: 'false'
            },
            params: {
              tenantId: 'north'
            },
            meta: {
              triggeredBy: 'ssd-app'
            }
          },
          properties: {
            data: { type: 'object', additionalProperties: true, description: 'Primary request body payload. Use `$.data` in inbound mappings.' },
            headers: { type: 'object', additionalProperties: true, description: 'Request headers. Use `$.headers` in inbound mappings.' },
            query: { type: 'object', additionalProperties: true, description: 'Query parameters. Use `$.query` in inbound mappings.' },
            params: { type: 'object', additionalProperties: true, description: 'Path parameters. Use `$.params` in inbound mappings.' },
            meta: { type: 'object', additionalProperties: true, description: 'Optional transport or caller metadata.' }
          }
        },
        EngineStartResponse: {
          type: 'object',
          example: {
            instanceId: 'pi_01HXYZ',
            status: 'ACCEPTED',
            output: {
              requestId: 'ORD-9001',
              message: 'Request received'
            }
          },
          properties: {
            success: { type: 'boolean', example: true },
            instanceId: { type: 'string' },
            status: { type: 'string', example: 'ACCEPTED' },
            output: { type: 'object', additionalProperties: true, description: 'Response body produced by Start outbound mapping or End output mapping depending on execution mode.' },
            variables: { type: 'object', additionalProperties: true }
          }
        },
        EngineProcessInstance: {
          type: 'object',
          properties: {
            instanceId: { type: 'string' },
            workflowName: { type: 'string' },
            namespace: { type: 'string' },
            status: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time', nullable: true },
            owner: { type: 'string', nullable: true },
            metadata: { type: 'object', additionalProperties: true }
          }
        },
        EngineProcessInstanceDetail: {
          type: 'object',
          properties: {
            instance: { $ref: '#/components/schemas/EngineProcessInstance' },
            variables: { type: 'object', additionalProperties: true },
            logs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nodeId: { type: 'string' },
                  nodeName: { type: 'string', nullable: true },
                  nodeType: { type: 'string', nullable: true },
                  status: { type: 'string' },
                  enteredAt: { type: 'string', format: 'date-time', nullable: true },
                  exitedAt: { type: 'string', format: 'date-time', nullable: true },
                  errorDetails: { type: 'string', nullable: true }
                }
              }
            },
            design: {
              type: 'object',
              properties: {
                bpmnXml: { type: 'string' },
                jsonConfig: { type: 'object', additionalProperties: true }
              }
            }
          }
        },
        EngineHumanTask: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            instanceId: { type: 'string' },
            nodeId: { type: 'string' },
            workflowName: { type: 'string', nullable: true },
            name: { type: 'string' },
            assignee: { type: 'string', nullable: true },
            status: { type: 'string' },
            potentialGroups: {
              type: 'array',
              items: { type: 'string' }
            },
            priority: { type: 'integer' },
            formData: { type: 'object', additionalProperties: true },
            createdAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        CompleteTaskRequest: {
          type: 'object',
          example: {
            output: {
              approved: true,
              approverComment: 'Looks good'
            },
            completedBy: 'john'
          },
          properties: {
            output: { type: 'object', additionalProperties: true, description: 'Submitted human task result used by task output mapping.' },
            completedBy: { type: 'string' }
          }
        },
        SignalRequest: {
          type: 'object',
          example: {
            signalName: 'PaymentReceived',
            payload: {
              paymentId: 'PAY-1',
              status: 'SETTLED'
            },
            scope: 'INSTANCE'
          },
          properties: {
            signalName: { type: 'string' },
            payload: { type: 'object', additionalProperties: true },
            scope: { type: 'string', enum: ['INSTANCE', 'GLOBAL'], default: 'INSTANCE' }
          },
          required: ['signalName']
        },
        AssetContractResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            inputs: { type: 'array', items: { type: 'string' } },
            outputs: { type: 'array', items: { type: 'string' } },
            locals: { type: 'array', items: { type: 'string' } }
          }
        },
        DeployRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            projectName: { type: 'string' },
            xml: { type: 'string' },
            json: { type: 'object', additionalProperties: true },
            version: { type: 'string' }
          },
          required: ['name', 'projectName', 'xml', 'json', 'version']
        },
        SuccessEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', nullable: true }
          }
        },
        EngineMutationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            taskId: { type: 'integer', nullable: true },
            waitingNodeId: { type: 'string', nullable: true },
            instanceId: { type: 'string', nullable: true },
            status: { type: 'string', nullable: true },
            output: { type: 'object', additionalProperties: true },
            variables: { type: 'object', additionalProperties: true },
            message: { type: 'string', nullable: true }
          }
        }
      }
    }
  };
}

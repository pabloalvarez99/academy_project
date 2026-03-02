# Kubernetes Fundamentals

Kubernetes (K8s) is an open-source container orchestration platform that automates deployment, scaling, and management of containerized applications.

## Core Architecture

```
Control Plane (master)            Worker Nodes
──────────────────────            ──────────────────────
API Server  ← kubectl             kubelet (runs pods)
Scheduler                         kube-proxy (networking)
Controller Manager                Container Runtime (containerd)
etcd (distributed KV store)
```

- **API Server**: single entry point for all cluster operations
- **Scheduler**: decides which node runs each pod
- **Controller Manager**: maintains desired state (ReplicaSet controller, etc.)
- **etcd**: source of truth — all cluster state stored here
- **kubelet**: agent on each node that ensures containers run as specified

## Key Objects

### Pod
The smallest deployable unit — one or more containers sharing network + storage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-pod
  labels:
    app: web
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
    resources:
      requests: { memory: "64Mi",  cpu: "100m" }
      limits:   { memory: "128Mi", cpu: "500m" }
```

Pods are ephemeral — don't create them directly. Use higher-level abstractions.

### Deployment
Manages a ReplicaSet for stateless applications:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deployment
spec:
  replicas: 3
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
      - name: web
        image: company/web:v1.2.0
        ports:
        - containerPort: 8080
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # extra pods during update
      maxUnavailable: 0  # no downtime
```

### Service
Stable network endpoint for a set of pods (pods come and go, Service IP is permanent):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP  # internal only (default)
  # type: LoadBalancer  # external cloud load balancer
  # type: NodePort      # expose on each node's IP:port
```

### ConfigMap and Secret
```yaml
# ConfigMap: non-sensitive configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: "postgres.default.svc.cluster.local"
  LOG_LEVEL: "info"

# Secret: sensitive data (base64 encoded, not encrypted by default!)
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DATABASE_PASSWORD: cGFzc3dvcmQ=  # base64("password")
```

Use in pods:
```yaml
env:
- name: DB_HOST
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: DATABASE_HOST
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: app-secrets
      key: DATABASE_PASSWORD
```

## Namespaces

Logical isolation within a cluster:

```bash
kubectl get pods -n production
kubectl get pods -n staging
kubectl get pods --all-namespaces

# DNS: service-name.namespace.svc.cluster.local
# Cross-namespace: http://api-service.production.svc.cluster.local
```

## Persistent Storage

Pods are stateless — attach persistent volumes for data:

```yaml
# PersistentVolumeClaim: request storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard

# Use in pod
volumes:
- name: postgres-data
  persistentVolumeClaim:
    claimName: postgres-pvc
containers:
- name: postgres
  volumeMounts:
  - name: postgres-data
    mountPath: /var/lib/postgresql/data
```

## StatefulSet vs Deployment

| | Deployment | StatefulSet |
|--|------------|-------------|
| Use case | Stateless apps | Stateful apps (DBs) |
| Pod names | random (web-7d8f9-xyz) | stable (postgres-0, postgres-1) |
| Storage | shared or none | each pod gets own PVC |
| Scaling | any order | ordered (0, 1, 2...) |

## Ingress

Route external HTTP/HTTPS traffic to internal services:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port: { number: 80 }
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port: { number: 80 }
  tls:
  - hosts: [api.example.com]
    secretName: tls-secret
```

Requires an **Ingress Controller** (nginx, Traefik, HAProxy) running in the cluster.

## Horizontal Pod Autoscaler

Scale based on CPU/memory metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Essential kubectl Commands

```bash
# Cluster info
kubectl get nodes
kubectl get pods -A          # all namespaces
kubectl describe pod <name>  # detailed info + events

# Deploy
kubectl apply -f deployment.yaml
kubectl rollout status deployment/web
kubectl rollout undo deployment/web  # rollback

# Scale
kubectl scale deployment web --replicas=5

# Debug
kubectl logs <pod-name> -f           # follow logs
kubectl exec -it <pod-name> -- bash  # shell into pod
kubectl port-forward pod/web-xyz 8080:80  # local tunnel

# Resources
kubectl top nodes
kubectl top pods
```

## Resource Management Best Practices

```yaml
resources:
  requests:  # minimum guaranteed resources
    memory: "128Mi"
    cpu: "100m"    # 100 millicores = 0.1 CPU core
  limits:    # maximum allowed
    memory: "256Mi"
    cpu: "500m"
```

**Always set requests and limits**: without requests, scheduler can't make placement decisions. Without limits, one pod can starve others.

**CPU throttling**: when a pod exceeds CPU limit, it's throttled (slowed down). No kill.
**OOM Kill**: when a pod exceeds memory limit, the kernel kills the process.

## Interview Questions

**Q: What's the difference between a Pod and a Deployment?**
A: A Pod is a single instance of one or more containers. A Deployment manages a ReplicaSet to maintain N replicas of a pod template, handles rolling updates, and provides rollback. Deployments are the standard way to run stateless apps — you never create bare pods in production because they won't be restarted if the node fails.

**Q: How does Kubernetes networking work?**
A: Every pod gets a unique IP (flat network — no NAT). Pods communicate directly by IP. Services provide a stable virtual IP (ClusterIP) via iptables/IPVS rules — load balancing traffic to matching pods. DNS resolves service names to ClusterIPs. Ingress controllers handle external HTTP routing. Network policies control which pods can communicate.

**Q: What's the difference between ClusterIP, NodePort, and LoadBalancer services?**
A: ClusterIP (default): accessible only within the cluster. NodePort: opens a static port on every node's external IP, accessible externally. LoadBalancer: provisions a cloud load balancer (AWS ALB, GCP LB) with a public IP — the standard for production external traffic. In practice: ClusterIP for internal service-to-service, LoadBalancer or Ingress for external traffic.

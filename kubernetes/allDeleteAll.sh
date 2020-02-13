#!/bin/bash
kubectl delete --all deployments
kubectl delete --all pods
kubectl delete --all svc
kubectl delete --all pvc
kubectl delete --all pv

kubectl get pvc | tail -n+2 | awk '{print $1}' | xargs -I{} kubectl patch pvc {} -p '{"metadata":{"finalizers": null}}'
kubectl get pv | tail -n+2 | awk '{print $1}' | xargs -I{} kubectl patch pv {} -p '{"metadata":{"finalizers": null}}'

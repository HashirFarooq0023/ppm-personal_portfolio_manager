import socket
import dns.resolver

try:
    print("Testing standard DNS resolution for google.com...")
    print(socket.gethostbyname("google.com"))
    
    print("\nTesting SRV resolution for the cluster...")
    srv_query = "_mongodb._tcp.ppmcluster.mtnvyjg.mongodb.net"
    results = dns.resolver.resolve(srv_query, 'SRV')
    for res in results:
        print(f"Host: {res.target} Port: {res.port}")
except Exception as e:
    print(f"\nDNS Resolution Failed: {e}")

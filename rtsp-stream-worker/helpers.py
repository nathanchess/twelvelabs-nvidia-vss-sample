import socket

async def read_stream(stream, prefix=''):
    """Helper function to read and print lines from a subprocess stream."""
    while True:
        line = await stream.readline()
        if line:
            print(f"[{prefix}] {line.decode().strip()}")
        else:
            break

def find_open_port():
    """Finds and returns a single open TCP port on the local machine."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        s.listen(1)
        return s.getsockname()[1]

def find_open_rtp_rtcp_ports():

    """Finds and returns a pair of open, consecutive even/odd ports for RTP/RTCP."""
    while True:
        rtp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        rtcp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        rtp_socket.bind(('', 0))
        base_port = rtp_socket.getsockname()[1]

        # If the port is odd, close and try again
        if base_port % 2 != 0:
            rtp_socket.close()
            rtcp_socket.close()
            continue

        rtp_port = base_port
        rtcp_port = base_port + 1
        
        try:
            rtcp_socket.bind(('', rtcp_port))
            # If we successfully bind both, we've found our pair
            rtp_socket.close()
            rtcp_socket.close()
            return rtp_port, rtcp_port
        except OSError:
            # If the RTCP port is in use, close sockets and loop again
            rtp_socket.close()
            rtcp_socket.close()
            continue

__all__ = ['read_stream', 'find_open_rtp_rtcp_ports', 'find_open_port']
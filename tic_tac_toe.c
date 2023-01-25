#include <stdio.h>
#include <sys/socket.h>
#include <arpa/inet.h>

struct sockaddr_in server;

int main(int argc, char* argv[]) {
 int socket_desc;
 socket_desc = socket(AF_INET, SOCK_STREAM, 0);
 if(socket_desc== -1){
     printf("couldn't create socket");
 }
 return 0;

}
